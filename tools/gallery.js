(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// gallery.js

//var THREE = require("three");
//var $ = require("jquery");
//var zip = zip.js

require("../polyfill.js");
var Map = require("../map");
var renderLoop = require("../model/renderloop");

require("../globals");

var warp = require("tpp-warp");

//On Ready
$(function(){
	
	MapManager.transitionTo("tGallery", 0);
	
	// currentMap = new Map("tGallery");
	// currentMap.load();
	// currentMap.queueForMapStart(function(){
	// 	UI.fadeIn();
	// });
	
	renderLoop.start({
		clearColor: 0x000000,
		ticksPerSecond : 20,
	});
	
});

},{"../globals":17,"../map":23,"../model/renderloop":28,"../polyfill.js":29,"tpp-warp":"tpp-warp"}],2:[function(require,module,exports){
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
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (length > kMaxLength)
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

  if (length > 0 && length <= Buffer.poolSize)
    buf.parent = rootParent

  return buf
}

function SlowBuffer(subject, encoding, noZero) {
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
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length, 2)
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
    throw new RangeError('attempt to write outside buffer bounds');

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
    val += this[offset + --byteLength] * mul;

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
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || source.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new RangeError('sourceStart out of bounds')
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

function utf8ToBytes(string, units) {
  var codePoint, length = string.length
  var leadSurrogate = null
  units = units || Infinity
  var bytes = []
  var i = 0

  for (; i<length; i++) {
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
        }

        // valid surrogate pair
        else {
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      }

      // no lead yet
      else {

        // unexpected trail
        if (codePoint > 0xDBFF) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // unpaired lead
        else if (i + 1 === length) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        else {
          leadSurrogate = codePoint
          continue
        }
      }
    }

    // valid bmp char, but last char was a lead
    else if (leadSurrogate) {
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    }
    else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else {
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

},{"./donger.js":14,"./userlist":15,"extend":"extend","tpp-controller":"tpp-controller"}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
// chat/userlist.js
// The list of users who will appear in chat, with info associated with them.

module.exports = [
{ color: "#000000", name: "ParkVisitor",			player: true, },

{ color: "#00FF00", name: "Tustin2121", 			contributor: true, },

{ color: "#FF0000", name: "Faithfulforce", 			chatleader: true, postmsg: "BloodTrail", },
{ color: "#FF0000", name: "Z33k33",					chatleader: true, premsg: "DBStyle", },



];


},{}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
// globals.js

window.CONFIG = {
	speed : {
		pathing: 0.25,
		animation: 3,
		bubblepop: 0.95,
	},
	timeout : {
		walkControl : 1,
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
window.Chat = require("./chat/core.js");

window.currentMap = null;
window.gameState = require("./gamestate");

},{"./chat/core.js":13,"./gamestate":16,"./managers/actorscheduler":18,"./managers/garbage-collector":19,"./managers/mapmanager":20,"./managers/soundmanager":21,"./managers/ui-manager":22}],18:[function(require,module,exports){
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

},{"extend":"extend","inherits":"inherits"}],19:[function(require,module,exports){
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
},{}],20:[function(require,module,exports){
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
	nextMap: null,
	loadError: null,
	
	transitionTo : function(mapid, warpindex, animOverride) {
		var self = this;

		controller.pushInputContext("_map_warping_");
		if (mapid !== undefined) {
			gameState.mapTransition.nextMap = mapid;
			gameState.mapTransition.warp = warpindex;
			gameState.mapTransition.animOverride = animOverride;
		} else {
			mapid = gameState.mapTransition.nextMap;
		}
		
		console.warn("Beginning Transition to", mapid);

		var fadeOutDone = false;
		var finishedDownload = false;
		UI.fadeOut(function(){
			UI.showLoadingAjax();
			fadeOutDone = true;
			if (finishedDownload && fadeOutDone) {
				__beginLoad();
			}
		});
		
		if (currentMap && currentMap.id == mapid) {
			// No need to download the next map
		} else {
			var nmap = this.nextMap = new Map(mapid);
			nmap.on("load-error", __loadError);
			nmap.on("progress", __progressUpdate);
			nmap.once("downloaded", __finishedDownload);
			nmap.once("map-started", __mapStart);
			
			nmap.download();
		}
		
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
		}
	},
});

module.exports = new MapManager();
},{"../map.js":23,"../model/dungeon-map.js":24,"events":6,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller"}],21:[function(require,module,exports){
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
		}
		return this.sounds[id];
	},
	
	/** Loads music from the server, used as part of the startup process. */
	registerPreloadedMusic: function(id, info) {
		if (!this.music[id]) {
			this.music[id] = createAudio_Tag(id, info); //force using this kind
			this.music[id].mustKeep = true;
		}
		return this.music[id];
	},
	
	/** Loads sound from data extracted from the map zip file. */
	loadSound: function(id, info) {
		if (!this.sounds[id]) {
			this.sounds[id] = this.createAudio(id, info);
		}
		return this.sounds[id];
	},
	
	/** Loads music from data extracted from the map zip file. */
	loadMusic: function(id, info) {
		if (!this.music[id]) {
			this._ensureRoomForMusic();
			this.music[id] = this.createAudio(id, info);
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
					this.__muteCtrl.gain.value -= delta * 0.05;
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
	sobj.__muteCtrl.connect(audioContext.destination);
	
	return sobj;
}



///////////////////////////////////////////////////////////////////////////////////
module.exports = new SoundManager();

},{"events":6,"extend":"extend","inherits":"inherits"}],22:[function(require,module,exports){
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
			tick = 5;
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
			
			self[prop].alpha += delta * (0.1 * self.speed);
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
	_opacity_speed: 0.2,
	spin: 0,
	_spin_speed: 90,
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

},{"events":6,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller","tpp-spritemodel":"tpp-spritemodel"}],23:[function(require,module,exports){
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
			
			function loadTexture(filename, callback) {
				var file = self.fileSys.root.getChildByName(filename);
				if (!file) {
					console.error("ERROR LOADING TEXTURE: No such file in map bundle! "+filename);
					callback(DEF_TEXTURE);
					return;
				}
				file.getBlob("image/png", function(data) {
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
			if (!self.mapmodel || !self.tiledata) return; //don't call on _init before both are loaded
			
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
		mSetup.setupRigging.call(this);
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
			if (self.eventMap.get(srcX, srcY).length > 0) {
				//Trying to find the Bug of the Phantom Sprites!
				console.warn("EVENT HAS MOVED FROM NON-EMPTY LOCATION!", evt.name);
			}
			
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



},{"./model/map-setup":25,"./model/obj-loader":27,"events":6,"extend":"extend","inherits":"inherits","ndarray":9,"tpp-event":"tpp-event","tpp-pc":"tpp-pc"}],24:[function(require,module,exports){
// dungeon-map.js
// Definition of the Dorito Dungeon

// &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650;
// ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▼ ◄ ▲ ► ▼ ◄ ▲

var inherits = require("inherits");
var extend = require("extend");

var Map = require("../map.js");
var PlayerChar = require("tpp-pc");
var mSetup = require("./map-setup");


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
		// mSetup.setupRigging.call(this);
		//NOTE: No lights
		
		this.scene.add(
			mSetup.camera.gen4.call(this, {
				"type" : "gen4",
				"cameras": {
					0: {},
				}
			})
		);
		
		this.queueForMapStart(function() {
			SoundManager.playMusic("m_tornworld");
			UI.skrim.speed = 0.2; //This will override the speed of the fadein done by the map manager.
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
},{"../map.js":23,"./map-setup":25,"extend":"extend","inherits":"inherits","tpp-pc":"tpp-pc"}],25:[function(require,module,exports){
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
			
			this.camera = new THREE.OrthographicCamera(scrWidth/-2, scrWidth/2, scrHeight/2, scrHeight/-2, 0.1, 150);
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
				var c = new THREE.PerspectiveCamera(55, scrWidth / scrHeight, 0.1, 150);
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
			
			if (!this.camera) throw new Error("No cameras defined!");
			
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
			
			this.camera = new THREE.PerspectiveCamera(75, scrWidth / scrHeight, 0.1, 150);
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
},{"extend":"extend"}],26:[function(require,module,exports){
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
			texture.name = args.src;
			scope.gc.collect(texture);
			
			console.log("CREATE IMG: ", args.src);
			currentMap.markLoading("MTL_"+args.src);
			scope.loadTexture(args.src, function(url){
				// Even though the images are in memory, apparently they still aren't "loaded"
				// at the point when they are assigned to the src attribute.
				console.log("FINISH CREATE IMG: ", args.src);
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

},{"events":6,"extend":"extend","inherits":"inherits","moment":8}],27:[function(require,module,exports){
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
},{"./mtl-loader":26,"events":6,"extend":"extend","inherits":"inherits","moment":8}],28:[function(require,module,exports){
// renderloop.js
// The module that handles all the common code to render and do game ticks on a map

var extend = require("extend");
var raf = require("raf");
var controller = require("tpp-controller");

module.exports = {
	start : function(opts) {
		// Set the canvas's attributes, because those 
		// ACTUALLY determine how big the rendering area is.
		if (!opts._disableTree) {
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
		
		var delta = wholeTick * 0.01;
		if (currentMap && currentMap.logicLoop)
			currentMap.logicLoop(delta);
		if (UI && UI.logicLoop)
			UI.logicLoop(delta);
		
		if (controller && controller._tick)
			controller._tick(delta);
		if (SoundManager && SoundManager._tick)
			SoundManager._tick(delta);
		
		accum -= wholeTick;
	}
}
},{"extend":"extend","raf":11,"tpp-controller":"tpp-controller"}],29:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXGdhbGxlcnkuanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcYmFzZTY0LWpzXFxsaWJcXGI2NC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcaWVlZTc1NFxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxub2RlX21vZHVsZXNcXGlzLWFycmF5XFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxldmVudHNcXGV2ZW50cy5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxwcm9jZXNzXFxicm93c2VyLmpzIiwibm9kZV9tb2R1bGVzXFxtb21lbnRcXG1vbWVudC5qcyIsIm5vZGVfbW9kdWxlc1xcbmRhcnJheVxcbmRhcnJheS5qcyIsIm5vZGVfbW9kdWxlc1xcbmRhcnJheVxcbm9kZV9tb2R1bGVzXFxpb3RhLWFycmF5XFxpb3RhLmpzIiwibm9kZV9tb2R1bGVzXFxyYWZcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxyYWZcXG5vZGVfbW9kdWxlc1xccGVyZm9ybWFuY2Utbm93XFxsaWJcXHBlcmZvcm1hbmNlLW5vdy5qcyIsInNyY1xcanNcXGNoYXRcXGNvcmUuanMiLCJzcmNcXGpzXFxjaGF0XFxkb25nZXIuanMiLCJzcmNcXGpzXFxjaGF0XFx1c2VybGlzdC5qcyIsInNyY1xcanNcXGdhbWVzdGF0ZS5qcyIsInNyY1xcanNcXGdsb2JhbHMuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcYWN0b3JzY2hlZHVsZXIuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcZ2FyYmFnZS1jb2xsZWN0b3IuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcbWFwbWFuYWdlci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxzb3VuZG1hbmFnZXIuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcdWktbWFuYWdlci5qcyIsInNyY1xcanNcXG1hcC5qcyIsInNyY1xcanNcXG1vZGVsXFxkdW5nZW9uLW1hcC5qcyIsInNyY1xcanNcXG1vZGVsXFxtYXAtc2V0dXAuanMiLCJzcmNcXGpzXFxtb2RlbFxcbXRsLWxvYWRlci5qcyIsInNyY1xcanNcXG1vZGVsXFxvYmotbG9hZGVyLmpzIiwic3JjXFxqc1xcbW9kZWxcXHJlbmRlcmxvb3AuanMiLCJzcmNcXGpzXFxwb2x5ZmlsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNweUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3gzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsaUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6MUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gZ2FsbGVyeS5qc1xyXG5cclxuLy92YXIgVEhSRUUgPSByZXF1aXJlKFwidGhyZWVcIik7XHJcbi8vdmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xyXG4vL3ZhciB6aXAgPSB6aXAuanNcclxuXHJcbnJlcXVpcmUoXCIuLi9wb2x5ZmlsbC5qc1wiKTtcclxudmFyIE1hcCA9IHJlcXVpcmUoXCIuLi9tYXBcIik7XHJcbnZhciByZW5kZXJMb29wID0gcmVxdWlyZShcIi4uL21vZGVsL3JlbmRlcmxvb3BcIik7XHJcblxyXG5yZXF1aXJlKFwiLi4vZ2xvYmFsc1wiKTtcclxuXHJcbnZhciB3YXJwID0gcmVxdWlyZShcInRwcC13YXJwXCIpO1xyXG5cclxuLy9PbiBSZWFkeVxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0TWFwTWFuYWdlci50cmFuc2l0aW9uVG8oXCJ0R2FsbGVyeVwiLCAwKTtcclxuXHRcclxuXHQvLyBjdXJyZW50TWFwID0gbmV3IE1hcChcInRHYWxsZXJ5XCIpO1xyXG5cdC8vIGN1cnJlbnRNYXAubG9hZCgpO1xyXG5cdC8vIGN1cnJlbnRNYXAucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpe1xyXG5cdC8vIFx0VUkuZmFkZUluKCk7XHJcblx0Ly8gfSk7XHJcblx0XHJcblx0cmVuZGVyTG9vcC5zdGFydCh7XHJcblx0XHRjbGVhckNvbG9yOiAweDAwMDAwMCxcclxuXHRcdHRpY2tzUGVyU2Vjb25kIDogMjAsXHJcblx0fSk7XHJcblx0XHJcbn0pO1xyXG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIGtNYXhMZW5ndGggPSAweDNmZmZmZmZmXG52YXIgcm9vdFBhcmVudCA9IHt9XG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIE5vdGU6XG4gKlxuICogLSBJbXBsZW1lbnRhdGlvbiBtdXN0IHN1cHBvcnQgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMuXG4gKiAgIEZpcmVmb3ggNC0yOSBsYWNrZWQgc3VwcG9ydCwgZml4ZWQgaW4gRmlyZWZveCAzMCsuXG4gKiAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG4gKlxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gc3ViamVjdCA+IDAgPyBzdWJqZWN0ID4+PiAwIDogMFxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4ga01heExlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICdzaXplOiAweCcgKyBrTWF4TGVuZ3RoLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gKChzdWJqZWN0W2ldICUgMjU2KSArIDI1NikgJSAyNTZcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICBpZiAobGVuZ3RoID4gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplKVxuICAgIGJ1Zi5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpXG4gICAgICBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihieXRlKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aCwgMilcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG5cbiAgaWYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKTtcblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlbjtcbiAgICBpZiAoc3RhcnQgPCAwKVxuICAgICAgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApXG4gICAgICBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpXG4gICAgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpXG4gICAgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsO1xuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpXG4gICAgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgPj4+IDAgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSA+Pj4gMCAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSW50KHRoaXMsXG4gICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgICAgIGJ5dGVMZW5ndGgsXG4gICAgICAgICAgICAgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSAtIDEsXG4gICAgICAgICAgICAgLU1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJbnQodGhpcyxcbiAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpIC0gMSxcbiAgICAgICAgICAgICAtTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSlcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRfc3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0X3N0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0X3N0YXJ0IDwgMClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMoc3RyaW5nLCB1bml0cykge1xuICB2YXIgY29kZVBvaW50LCBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBieXRlcyA9IFtdXG4gIHZhciBpID0gMFxuXG4gIGZvciAoOyBpPGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuXG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKGxlYWRTdXJyb2dhdGUpIHtcblxuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgIGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICB9XG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcblxuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoLCB1bml0U2l6ZSkge1xuICBpZiAodW5pdFNpemUpIGxlbmd0aCAtPSBsZW5ndGggJSB1bml0U2l6ZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLy8hIG1vbWVudC5qc1xuLy8hIHZlcnNpb24gOiAyLjguNFxuLy8hIGF1dGhvcnMgOiBUaW0gV29vZCwgSXNrcmVuIENoZXJuZXYsIE1vbWVudC5qcyBjb250cmlidXRvcnNcbi8vISBsaWNlbnNlIDogTUlUXG4vLyEgbW9tZW50anMuY29tXG5cbihmdW5jdGlvbiAodW5kZWZpbmVkKSB7XG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdGFudHNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgbW9tZW50LFxuICAgICAgICBWRVJTSU9OID0gJzIuOC40JyxcbiAgICAgICAgLy8gdGhlIGdsb2JhbC1zY29wZSB0aGlzIGlzIE5PVCB0aGUgZ2xvYmFsIG9iamVjdCBpbiBOb2RlLmpzXG4gICAgICAgIGdsb2JhbFNjb3BlID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzLFxuICAgICAgICBvbGRHbG9iYWxNb21lbnQsXG4gICAgICAgIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgICBpLFxuXG4gICAgICAgIFlFQVIgPSAwLFxuICAgICAgICBNT05USCA9IDEsXG4gICAgICAgIERBVEUgPSAyLFxuICAgICAgICBIT1VSID0gMyxcbiAgICAgICAgTUlOVVRFID0gNCxcbiAgICAgICAgU0VDT05EID0gNSxcbiAgICAgICAgTUlMTElTRUNPTkQgPSA2LFxuXG4gICAgICAgIC8vIGludGVybmFsIHN0b3JhZ2UgZm9yIGxvY2FsZSBjb25maWcgZmlsZXNcbiAgICAgICAgbG9jYWxlcyA9IHt9LFxuXG4gICAgICAgIC8vIGV4dHJhIG1vbWVudCBpbnRlcm5hbCBwcm9wZXJ0aWVzIChwbHVnaW5zIHJlZ2lzdGVyIHByb3BzIGhlcmUpXG4gICAgICAgIG1vbWVudFByb3BlcnRpZXMgPSBbXSxcblxuICAgICAgICAvLyBjaGVjayBmb3Igbm9kZUpTXG4gICAgICAgIGhhc01vZHVsZSA9ICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpLFxuXG4gICAgICAgIC8vIEFTUC5ORVQganNvbiBkYXRlIGZvcm1hdCByZWdleFxuICAgICAgICBhc3BOZXRKc29uUmVnZXggPSAvXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pLFxuICAgICAgICBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleCA9IC8oXFwtKT8oPzooXFxkKilcXC4pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKVxcLj8oXFxkezN9KT8pPy8sXG5cbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZG9jcy5jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vZ2l0L2Nsb3N1cmVfZ29vZ19kYXRlX2RhdGUuanMuc291cmNlLmh0bWxcbiAgICAgICAgLy8gc29tZXdoYXQgbW9yZSBpbiBsaW5lIHdpdGggNC40LjMuMiAyMDA0IHNwZWMsIGJ1dCBhbGxvd3MgZGVjaW1hbCBhbnl3aGVyZVxuICAgICAgICBpc29EdXJhdGlvblJlZ2V4ID0gL14oLSk/UCg/Oig/OihbMC05LC5dKilZKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKUQpPyg/OlQoPzooWzAtOSwuXSopSCk/KD86KFswLTksLl0qKU0pPyg/OihbMC05LC5dKilTKT8pP3woWzAtOSwuXSopVykkLyxcblxuICAgICAgICAvLyBmb3JtYXQgdG9rZW5zXG4gICAgICAgIGZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTW98TU0/TT9NP3xEb3xERERvfEREP0Q/RD98ZGRkP2Q/fGRvP3x3W298d10/fFdbb3xXXT98UXxZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xtbT98c3M/fFN7MSw0fXx4fFh8eno/fFpaP3wuKS9nLFxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFRTfExUfExMP0w/TD98bHsxLDR9KS9nLFxuXG4gICAgICAgIC8vIHBhcnNpbmcgdG9rZW4gcmVnZXhlc1xuICAgICAgICBwYXJzZVRva2VuT25lT3JUd29EaWdpdHMgPSAvXFxkXFxkPy8sIC8vIDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cyA9IC9cXGR7MSwzfS8sIC8vIDAgLSA5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cyA9IC9cXGR7MSw0fS8sIC8vIDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1NpeERpZ2l0cyA9IC9bK1xcLV0/XFxkezEsNn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlbkRpZ2l0cyA9IC9cXGQrLywgLy8gbm9uemVybyBudW1iZXIgb2YgZGlnaXRzXG4gICAgICAgIHBhcnNlVG9rZW5Xb3JkID0gL1swLTldKlsnYS16XFx1MDBBMC1cXHUwNUZGXFx1MDcwMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSt8W1xcdTA2MDAtXFx1MDZGRlxcL10rKFxccyo/W1xcdTA2MDAtXFx1MDZGRl0rKXsxLDJ9L2ksIC8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuICAgICAgICBwYXJzZVRva2VuVGltZXpvbmUgPSAvWnxbXFwrXFwtXVxcZFxcZDo/XFxkXFxkL2dpLCAvLyArMDA6MDAgLTAwOjAwICswMDAwIC0wMDAwIG9yIFpcbiAgICAgICAgcGFyc2VUb2tlblQgPSAvVC9pLCAvLyBUIChJU08gc2VwYXJhdG9yKVxuICAgICAgICBwYXJzZVRva2VuT2Zmc2V0TXMgPSAvW1xcK1xcLV0/XFxkKy8sIC8vIDEyMzQ1Njc4OTAxMjNcbiAgICAgICAgcGFyc2VUb2tlblRpbWVzdGFtcE1zID0gL1tcXCtcXC1dP1xcZCsoXFwuXFxkezEsM30pPy8sIC8vIDEyMzQ1Njc4OSAxMjM0NTY3ODkuMTIzXG5cbiAgICAgICAgLy9zdHJpY3QgcGFyc2luZyByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVEaWdpdCA9IC9cXGQvLCAvLyAwIC0gOVxuICAgICAgICBwYXJzZVRva2VuVHdvRGlnaXRzID0gL1xcZFxcZC8sIC8vIDAwIC0gOTlcbiAgICAgICAgcGFyc2VUb2tlblRocmVlRGlnaXRzID0gL1xcZHszfS8sIC8vIDAwMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuRm91ckRpZ2l0cyA9IC9cXGR7NH0vLCAvLyAwMDAwIC0gOTk5OVxuICAgICAgICBwYXJzZVRva2VuU2l4RGlnaXRzID0gL1srLV0/XFxkezZ9LywgLy8gLTk5OSw5OTkgLSA5OTksOTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaWduZWROdW1iZXIgPSAvWystXT9cXGQrLywgLy8gLWluZiAtIGluZlxuXG4gICAgICAgIC8vIGlzbyA4NjAxIHJlZ2V4XG4gICAgICAgIC8vIDAwMDAtMDAtMDAgMDAwMC1XMDAgb3IgMDAwMC1XMDAtMCArIFQgKyAwMCBvciAwMDowMCBvciAwMDowMDowMCBvciAwMDowMDowMC4wMDAgKyArMDA6MDAgb3IgKzAwMDAgb3IgKzAwKVxuICAgICAgICBpc29SZWdleCA9IC9eXFxzKig/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzooXFxkXFxkLVxcZFxcZCl8KFdcXGRcXGQkKXwoV1xcZFxcZC1cXGQpfChcXGRcXGRcXGQpKSgoVHwgKShcXGRcXGQoOlxcZFxcZCg6XFxkXFxkKFxcLlxcZCspPyk/KT8pPyhbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sXG5cbiAgICAgICAgaXNvRm9ybWF0ID0gJ1lZWVktTU0tRERUSEg6bW06c3NaJyxcblxuICAgICAgICBpc29EYXRlcyA9IFtcbiAgICAgICAgICAgIFsnWVlZWVlZLU1NLUREJywgL1srLV1cXGR7Nn0tXFxkezJ9LVxcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLU1NLUREJywgL1xcZHs0fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ0dHR0ctW1ddV1ctRScsIC9cXGR7NH0tV1xcZHsyfS1cXGQvXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVycsIC9cXGR7NH0tV1xcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLURERCcsIC9cXGR7NH0tXFxkezN9L11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyBpc28gdGltZSBmb3JtYXRzIGFuZCByZWdleGVzXG4gICAgICAgIGlzb1RpbWVzID0gW1xuICAgICAgICAgICAgWydISDptbTpzcy5TU1NTJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sXG4gICAgICAgICAgICBbJ0hIOm1tOnNzJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEg6bW0nLCAvKFR8IClcXGRcXGQ6XFxkXFxkL10sXG4gICAgICAgICAgICBbJ0hIJywgLyhUfCApXFxkXFxkL11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyB0aW1lem9uZSBjaHVua2VyICcrMTA6MDAnID4gWycxMCcsICcwMCddIG9yICctMTUzMCcgPiBbJy0xNScsICczMCddXG4gICAgICAgIHBhcnNlVGltZXpvbmVDaHVua2VyID0gLyhbXFwrXFwtXXxcXGRcXGQpL2dpLFxuXG4gICAgICAgIC8vIGdldHRlciBhbmQgc2V0dGVyIG5hbWVzXG4gICAgICAgIHByb3h5R2V0dGVyc0FuZFNldHRlcnMgPSAnRGF0ZXxIb3Vyc3xNaW51dGVzfFNlY29uZHN8TWlsbGlzZWNvbmRzJy5zcGxpdCgnfCcpLFxuICAgICAgICB1bml0TWlsbGlzZWNvbmRGYWN0b3JzID0ge1xuICAgICAgICAgICAgJ01pbGxpc2Vjb25kcycgOiAxLFxuICAgICAgICAgICAgJ1NlY29uZHMnIDogMWUzLFxuICAgICAgICAgICAgJ01pbnV0ZXMnIDogNmU0LFxuICAgICAgICAgICAgJ0hvdXJzJyA6IDM2ZTUsXG4gICAgICAgICAgICAnRGF5cycgOiA4NjRlNSxcbiAgICAgICAgICAgICdNb250aHMnIDogMjU5MmU2LFxuICAgICAgICAgICAgJ1llYXJzJyA6IDMxNTM2ZTZcbiAgICAgICAgfSxcblxuICAgICAgICB1bml0QWxpYXNlcyA9IHtcbiAgICAgICAgICAgIG1zIDogJ21pbGxpc2Vjb25kJyxcbiAgICAgICAgICAgIHMgOiAnc2Vjb25kJyxcbiAgICAgICAgICAgIG0gOiAnbWludXRlJyxcbiAgICAgICAgICAgIGggOiAnaG91cicsXG4gICAgICAgICAgICBkIDogJ2RheScsXG4gICAgICAgICAgICBEIDogJ2RhdGUnLFxuICAgICAgICAgICAgdyA6ICd3ZWVrJyxcbiAgICAgICAgICAgIFcgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICBNIDogJ21vbnRoJyxcbiAgICAgICAgICAgIFEgOiAncXVhcnRlcicsXG4gICAgICAgICAgICB5IDogJ3llYXInLFxuICAgICAgICAgICAgREREIDogJ2RheU9mWWVhcicsXG4gICAgICAgICAgICBlIDogJ3dlZWtkYXknLFxuICAgICAgICAgICAgRSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGdnOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgR0c6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICBjYW1lbEZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIGRheW9meWVhciA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgaXNvd2Vla2RheSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGlzb3dlZWsgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICB3ZWVreWVhciA6ICd3ZWVrWWVhcicsXG4gICAgICAgICAgICBpc293ZWVreWVhciA6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBmb3JtYXQgZnVuY3Rpb24gc3RyaW5nc1xuICAgICAgICBmb3JtYXRGdW5jdGlvbnMgPSB7fSxcblxuICAgICAgICAvLyBkZWZhdWx0IHJlbGF0aXZlIHRpbWUgdGhyZXNob2xkc1xuICAgICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzID0ge1xuICAgICAgICAgICAgczogNDUsICAvLyBzZWNvbmRzIHRvIG1pbnV0ZVxuICAgICAgICAgICAgbTogNDUsICAvLyBtaW51dGVzIHRvIGhvdXJcbiAgICAgICAgICAgIGg6IDIyLCAgLy8gaG91cnMgdG8gZGF5XG4gICAgICAgICAgICBkOiAyNiwgIC8vIGRheXMgdG8gbW9udGhcbiAgICAgICAgICAgIE06IDExICAgLy8gbW9udGhzIHRvIHllYXJcbiAgICAgICAgfSxcblxuICAgICAgICAvLyB0b2tlbnMgdG8gb3JkaW5hbGl6ZSBhbmQgcGFkXG4gICAgICAgIG9yZGluYWxpemVUb2tlbnMgPSAnREREIHcgVyBNIEQgZCcuc3BsaXQoJyAnKSxcbiAgICAgICAgcGFkZGVkVG9rZW5zID0gJ00gRCBIIGggbSBzIHcgVycuc3BsaXQoJyAnKSxcblxuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIE0gICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBNTU1NIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEREQgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheU9mWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQgICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNNaW4odGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZGQgIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkZCA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBXICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWSAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB5ID0gdGhpcy55ZWFyKCksIHNpZ24gPSB5ID49IDAgPyAnKycgOiAnLSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWZ0WmVyb0ZpbGwoTWF0aC5hYnMoeSksIDYpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHRyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG91cnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1pbnV0ZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlY29uZHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b0ludCh0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTUyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwKSwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1NTICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMubWlsbGlzZWNvbmRzKCksIDMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTU1MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gLXRoaXMuem9uZSgpLFxuICAgICAgICAgICAgICAgICAgICBiID0gJysnO1xuICAgICAgICAgICAgICAgIGlmIChhIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBhID0gLWE7XG4gICAgICAgICAgICAgICAgICAgIGIgPSAnLSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBiICsgbGVmdFplcm9GaWxsKHRvSW50KGEgLyA2MCksIDIpICsgJzonICsgbGVmdFplcm9GaWxsKHRvSW50KGEpICUgNjAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFpaICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSAtdGhpcy56b25lKCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSAnKyc7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9ICctJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSkgJSA2MCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy56b25lQWJicigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHp6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVOYW1lKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy51bml4KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5xdWFydGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVwcmVjYXRpb25zID0ge30sXG5cbiAgICAgICAgbGlzdHMgPSBbJ21vbnRocycsICdtb250aHNTaG9ydCcsICd3ZWVrZGF5cycsICd3ZWVrZGF5c1Nob3J0JywgJ3dlZWtkYXlzTWluJ107XG5cbiAgICAvLyBQaWNrIHRoZSBmaXJzdCBkZWZpbmVkIG9mIHR3byBvciB0aHJlZSBhcmd1bWVudHMuIGRmbCBjb21lcyBmcm9tXG4gICAgLy8gZGVmYXVsdC5cbiAgICBmdW5jdGlvbiBkZmwoYSwgYiwgYykge1xuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIGEgIT0gbnVsbCA/IGEgOiBiO1xuICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gYSAhPSBudWxsID8gYSA6IGIgIT0gbnVsbCA/IGIgOiBjO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdJbXBsZW1lbnQgbWUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc093blByb3AoYSwgYikge1xuICAgICAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChhLCBiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UGFyc2luZ0ZsYWdzKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGRlZXAgY2xvbmUgdGhpcyBvYmplY3QsIGFuZCBlczUgc3RhbmRhcmQgaXMgbm90IHZlcnlcbiAgICAgICAgLy8gaGVscGZ1bC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVtcHR5IDogZmFsc2UsXG4gICAgICAgICAgICB1bnVzZWRUb2tlbnMgOiBbXSxcbiAgICAgICAgICAgIHVudXNlZElucHV0IDogW10sXG4gICAgICAgICAgICBvdmVyZmxvdyA6IC0yLFxuICAgICAgICAgICAgY2hhcnNMZWZ0T3ZlciA6IDAsXG4gICAgICAgICAgICBudWxsSW5wdXQgOiBmYWxzZSxcbiAgICAgICAgICAgIGludmFsaWRNb250aCA6IG51bGwsXG4gICAgICAgICAgICBpbnZhbGlkRm9ybWF0IDogZmFsc2UsXG4gICAgICAgICAgICB1c2VySW52YWxpZGF0ZWQgOiBmYWxzZSxcbiAgICAgICAgICAgIGlzbzogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmludE1zZyhtc2cpIHtcbiAgICAgICAgaWYgKG1vbWVudC5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdEZXByZWNhdGlvbiB3YXJuaW5nOiAnICsgbXNnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgICAgIHZhciBmaXJzdFRpbWUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChmaXJzdFRpbWUpIHtcbiAgICAgICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGZuKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXByZWNhdGVTaW1wbGUobmFtZSwgbXNnKSB7XG4gICAgICAgIGlmICghZGVwcmVjYXRpb25zW25hbWVdKSB7XG4gICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgZGVwcmVjYXRpb25zW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZFRva2VuKGZ1bmMsIGNvdW50KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbChmdW5jLmNhbGwodGhpcywgYSksIGNvdW50KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gb3JkaW5hbGl6ZVRva2VuKGZ1bmMsIHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5vcmRpbmFsKGZ1bmMuY2FsbCh0aGlzLCBhKSwgcGVyaW9kKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB3aGlsZSAob3JkaW5hbGl6ZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IG9yZGluYWxpemVUb2tlbnMucG9wKCk7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW2kgKyAnbyddID0gb3JkaW5hbGl6ZVRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zW2ldLCBpKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhZGRlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IHBhZGRlZFRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArIGldID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIDIpO1xuICAgIH1cbiAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREREID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnMuRERELCAzKTtcblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdHJ1Y3RvcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBMb2NhbGUoKSB7XG4gICAgfVxuXG4gICAgLy8gTW9tZW50IHByb3RvdHlwZSBvYmplY3RcbiAgICBmdW5jdGlvbiBNb21lbnQoY29uZmlnLCBza2lwT3ZlcmZsb3cpIHtcbiAgICAgICAgaWYgKHNraXBPdmVyZmxvdyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICBjb3B5Q29uZmlnKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgIHRoaXMuX2QgPSBuZXcgRGF0ZSgrY29uZmlnLl9kKTtcbiAgICB9XG5cbiAgICAvLyBEdXJhdGlvbiBDb25zdHJ1Y3RvclxuICAgIGZ1bmN0aW9uIER1cmF0aW9uKGR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhkdXJhdGlvbiksXG4gICAgICAgICAgICB5ZWFycyA9IG5vcm1hbGl6ZWRJbnB1dC55ZWFyIHx8IDAsXG4gICAgICAgICAgICBxdWFydGVycyA9IG5vcm1hbGl6ZWRJbnB1dC5xdWFydGVyIHx8IDAsXG4gICAgICAgICAgICBtb250aHMgPSBub3JtYWxpemVkSW5wdXQubW9udGggfHwgMCxcbiAgICAgICAgICAgIHdlZWtzID0gbm9ybWFsaXplZElucHV0LndlZWsgfHwgMCxcbiAgICAgICAgICAgIGRheXMgPSBub3JtYWxpemVkSW5wdXQuZGF5IHx8IDAsXG4gICAgICAgICAgICBob3VycyA9IG5vcm1hbGl6ZWRJbnB1dC5ob3VyIHx8IDAsXG4gICAgICAgICAgICBtaW51dGVzID0gbm9ybWFsaXplZElucHV0Lm1pbnV0ZSB8fCAwLFxuICAgICAgICAgICAgc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQgfHwgMCxcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZCB8fCAwO1xuXG4gICAgICAgIC8vIHJlcHJlc2VudGF0aW9uIGZvciBkYXRlQWRkUmVtb3ZlXG4gICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9ICttaWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgc2Vjb25kcyAqIDFlMyArIC8vIDEwMDBcbiAgICAgICAgICAgIG1pbnV0ZXMgKiA2ZTQgKyAvLyAxMDAwICogNjBcbiAgICAgICAgICAgIGhvdXJzICogMzZlNTsgLy8gMTAwMCAqIDYwICogNjBcbiAgICAgICAgLy8gQmVjYXVzZSBvZiBkYXRlQWRkUmVtb3ZlIHRyZWF0cyAyNCBob3VycyBhcyBkaWZmZXJlbnQgZnJvbSBhXG4gICAgICAgIC8vIGRheSB3aGVuIHdvcmtpbmcgYXJvdW5kIERTVCwgd2UgbmVlZCB0byBzdG9yZSB0aGVtIHNlcGFyYXRlbHlcbiAgICAgICAgdGhpcy5fZGF5cyA9ICtkYXlzICtcbiAgICAgICAgICAgIHdlZWtzICogNztcbiAgICAgICAgLy8gSXQgaXMgaW1wb3NzaWJsZSB0cmFuc2xhdGUgbW9udGhzIGludG8gZGF5cyB3aXRob3V0IGtub3dpbmdcbiAgICAgICAgLy8gd2hpY2ggbW9udGhzIHlvdSBhcmUgYXJlIHRhbGtpbmcgYWJvdXQsIHNvIHdlIGhhdmUgdG8gc3RvcmVcbiAgICAgICAgLy8gaXQgc2VwYXJhdGVseS5cbiAgICAgICAgdGhpcy5fbW9udGhzID0gK21vbnRocyArXG4gICAgICAgICAgICBxdWFydGVycyAqIDMgK1xuICAgICAgICAgICAgeWVhcnMgKiAxMjtcblxuICAgICAgICB0aGlzLl9kYXRhID0ge307XG5cbiAgICAgICAgdGhpcy5fbG9jYWxlID0gbW9tZW50LmxvY2FsZURhdGEoKTtcblxuICAgICAgICB0aGlzLl9idWJibGUoKTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEhlbHBlcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGV4dGVuZChhLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYikge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3AoYiwgaSkpIHtcbiAgICAgICAgICAgICAgICBhW2ldID0gYltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd0b1N0cmluZycpKSB7XG4gICAgICAgICAgICBhLnRvU3RyaW5nID0gYi50b1N0cmluZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd2YWx1ZU9mJykpIHtcbiAgICAgICAgICAgIGEudmFsdWVPZiA9IGIudmFsdWVPZjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHlDb25maWcodG8sIGZyb20pIHtcbiAgICAgICAgdmFyIGksIHByb3AsIHZhbDtcblxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzQU1vbWVudE9iamVjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9pc0FNb21lbnRPYmplY3QgPSBmcm9tLl9pc0FNb21lbnRPYmplY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2kgPSBmcm9tLl9pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9mID0gZnJvbS5fZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2wgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fbCA9IGZyb20uX2w7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9zdHJpY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fc3RyaWN0ID0gZnJvbS5fc3RyaWN0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fdHptICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX3R6bSA9IGZyb20uX3R6bTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzVVRDICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzVVRDID0gZnJvbS5faXNVVEM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9vZmZzZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fb2Zmc2V0ID0gZnJvbS5fb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fcGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fcGYgPSBmcm9tLl9wZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2xvY2FsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9sb2NhbGUgPSBmcm9tLl9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9tZW50UHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmb3IgKGkgaW4gbW9tZW50UHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHByb3AgPSBtb21lbnRQcm9wZXJ0aWVzW2ldO1xuICAgICAgICAgICAgICAgIHZhbCA9IGZyb21bcHJvcF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvW3Byb3BdID0gdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0bztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhYnNSb3VuZChudW1iZXIpIHtcbiAgICAgICAgaWYgKG51bWJlciA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsZWZ0IHplcm8gZmlsbCBhIG51bWJlclxuICAgIC8vIHNlZSBodHRwOi8vanNwZXJmLmNvbS9sZWZ0LXplcm8tZmlsbGluZyBmb3IgcGVyZm9ybWFuY2UgY29tcGFyaXNvblxuICAgIGZ1bmN0aW9uIGxlZnRaZXJvRmlsbChudW1iZXIsIHRhcmdldExlbmd0aCwgZm9yY2VTaWduKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSAnJyArIE1hdGguYWJzKG51bWJlciksXG4gICAgICAgICAgICBzaWduID0gbnVtYmVyID49IDA7XG5cbiAgICAgICAgd2hpbGUgKG91dHB1dC5sZW5ndGggPCB0YXJnZXRMZW5ndGgpIHtcbiAgICAgICAgICAgIG91dHB1dCA9ICcwJyArIG91dHB1dDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHNpZ24gPyAoZm9yY2VTaWduID8gJysnIDogJycpIDogJy0nKSArIG91dHB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXMgPSB7bWlsbGlzZWNvbmRzOiAwLCBtb250aHM6IDB9O1xuXG4gICAgICAgIHJlcy5tb250aHMgPSBvdGhlci5tb250aCgpIC0gYmFzZS5tb250aCgpICtcbiAgICAgICAgICAgIChvdGhlci55ZWFyKCkgLSBiYXNlLnllYXIoKSkgKiAxMjtcbiAgICAgICAgaWYgKGJhc2UuY2xvbmUoKS5hZGQocmVzLm1vbnRocywgJ00nKS5pc0FmdGVyKG90aGVyKSkge1xuICAgICAgICAgICAgLS1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9ICtvdGhlciAtICsoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpKTtcblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXM7XG4gICAgICAgIG90aGVyID0gbWFrZUFzKG90aGVyLCBiYXNlKTtcbiAgICAgICAgaWYgKGJhc2UuaXNCZWZvcmUob3RoZXIpKSB7XG4gICAgICAgICAgICByZXMgPSBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcyA9IHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2Uob3RoZXIsIGJhc2UpO1xuICAgICAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9IC1yZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgcmVzLm1vbnRocyA9IC1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgJ25hbWUnIGFyZyBhZnRlciBkZXByZWNhdGlvbiBpcyByZW1vdmVkXG4gICAgZnVuY3Rpb24gY3JlYXRlQWRkZXIoZGlyZWN0aW9uLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBwZXJpb2QpIHtcbiAgICAgICAgICAgIHZhciBkdXIsIHRtcDtcbiAgICAgICAgICAgIC8vaW52ZXJ0IHRoZSBhcmd1bWVudHMsIGJ1dCBjb21wbGFpbiBhYm91dCBpdFxuICAgICAgICAgICAgaWYgKHBlcmlvZCAhPT0gbnVsbCAmJiAhaXNOYU4oK3BlcmlvZCkpIHtcbiAgICAgICAgICAgICAgICBkZXByZWNhdGVTaW1wbGUobmFtZSwgJ21vbWVudCgpLicgKyBuYW1lICArICcocGVyaW9kLCBudW1iZXIpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgbW9tZW50KCkuJyArIG5hbWUgKyAnKG51bWJlciwgcGVyaW9kKS4nKTtcbiAgICAgICAgICAgICAgICB0bXAgPSB2YWw7IHZhbCA9IHBlcmlvZDsgcGVyaW9kID0gdG1wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/ICt2YWwgOiB2YWw7XG4gICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24odmFsLCBwZXJpb2QpO1xuICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLCBkdXIsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KG1vbSwgZHVyYXRpb24sIGlzQWRkaW5nLCB1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IGR1cmF0aW9uLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICBkYXlzID0gZHVyYXRpb24uX2RheXMsXG4gICAgICAgICAgICBtb250aHMgPSBkdXJhdGlvbi5fbW9udGhzO1xuICAgICAgICB1cGRhdGVPZmZzZXQgPSB1cGRhdGVPZmZzZXQgPT0gbnVsbCA/IHRydWUgOiB1cGRhdGVPZmZzZXQ7XG5cbiAgICAgICAgaWYgKG1pbGxpc2Vjb25kcykge1xuICAgICAgICAgICAgbW9tLl9kLnNldFRpbWUoK21vbS5fZCArIG1pbGxpc2Vjb25kcyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF5cykge1xuICAgICAgICAgICAgcmF3U2V0dGVyKG1vbSwgJ0RhdGUnLCByYXdHZXR0ZXIobW9tLCAnRGF0ZScpICsgZGF5cyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9udGhzKSB7XG4gICAgICAgICAgICByYXdNb250aFNldHRlcihtb20sIHJhd0dldHRlcihtb20sICdNb250aCcpICsgbW9udGhzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQobW9tLCBkYXlzIHx8IG1vbnRocyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiBpcyBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBEYXRlXScgfHxcbiAgICAgICAgICAgIGlucHV0IGluc3RhbmNlb2YgRGF0ZTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIHR3byBhcnJheXMsIHJldHVybiB0aGUgbnVtYmVyIG9mIGRpZmZlcmVuY2VzXG4gICAgZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhcnJheTEsIGFycmF5MiwgZG9udENvbnZlcnQpIHtcbiAgICAgICAgdmFyIGxlbiA9IE1hdGgubWluKGFycmF5MS5sZW5ndGgsIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgbGVuZ3RoRGlmZiA9IE1hdGguYWJzKGFycmF5MS5sZW5ndGggLSBhcnJheTIubGVuZ3RoKSxcbiAgICAgICAgICAgIGRpZmZzID0gMCxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKChkb250Q29udmVydCAmJiBhcnJheTFbaV0gIT09IGFycmF5MltpXSkgfHxcbiAgICAgICAgICAgICAgICAoIWRvbnRDb252ZXJ0ICYmIHRvSW50KGFycmF5MVtpXSkgIT09IHRvSW50KGFycmF5MltpXSkpKSB7XG4gICAgICAgICAgICAgICAgZGlmZnMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlmZnMgKyBsZW5ndGhEaWZmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKSB7XG4gICAgICAgIGlmICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGxvd2VyZWQgPSB1bml0cy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyguKXMkLywgJyQxJyk7XG4gICAgICAgICAgICB1bml0cyA9IHVuaXRBbGlhc2VzW3VuaXRzXSB8fCBjYW1lbEZ1bmN0aW9uc1tsb3dlcmVkXSB8fCBsb3dlcmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bml0cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVPYmplY3RVbml0cyhpbnB1dE9iamVjdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0ID0ge30sXG4gICAgICAgICAgICBub3JtYWxpemVkUHJvcCxcbiAgICAgICAgICAgIHByb3A7XG5cbiAgICAgICAgZm9yIChwcm9wIGluIGlucHV0T2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcChpbnB1dE9iamVjdCwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkUHJvcCA9IG5vcm1hbGl6ZVVuaXRzKHByb3ApO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUHJvcCkge1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkSW5wdXRbbm9ybWFsaXplZFByb3BdID0gaW5wdXRPYmplY3RbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRJbnB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlTGlzdChmaWVsZCkge1xuICAgICAgICB2YXIgY291bnQsIHNldHRlcjtcblxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignd2VlaycpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDc7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnZGF5JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChmaWVsZC5pbmRleE9mKCdtb250aCcpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDEyO1xuICAgICAgICAgICAgc2V0dGVyID0gJ21vbnRoJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vbWVudFtmaWVsZF0gPSBmdW5jdGlvbiAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGksIGdldHRlcixcbiAgICAgICAgICAgICAgICBtZXRob2QgPSBtb21lbnQuX2xvY2FsZVtmaWVsZF0sXG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZvcm1hdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdldHRlciA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBtb21lbnQoKS51dGMoKS5zZXQoc2V0dGVyLCBpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kLmNhbGwobW9tZW50Ll9sb2NhbGUsIG0sIGZvcm1hdCB8fCAnJyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXR0ZXIoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldHRlcihpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSW50KGFyZ3VtZW50Rm9yQ29lcmNpb24pIHtcbiAgICAgICAgdmFyIGNvZXJjZWROdW1iZXIgPSArYXJndW1lbnRGb3JDb2VyY2lvbixcbiAgICAgICAgICAgIHZhbHVlID0gMDtcblxuICAgICAgICBpZiAoY29lcmNlZE51bWJlciAhPT0gMCAmJiBpc0Zpbml0ZShjb2VyY2VkTnVtYmVyKSkge1xuICAgICAgICAgICAgaWYgKGNvZXJjZWROdW1iZXIgPj0gMCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5mbG9vcihjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmNlaWwoY29lcmNlZE51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5c0luTW9udGgoeWVhciwgbW9udGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoICsgMSwgMCkpLmdldFVUQ0RhdGUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3ZWVrc0luWWVhcih5ZWFyLCBkb3csIGRveSkge1xuICAgICAgICByZXR1cm4gd2Vla09mWWVhcihtb21lbnQoW3llYXIsIDExLCAzMSArIGRvdyAtIGRveV0pLCBkb3csIGRveSkud2VlaztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5ZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuIGlzTGVhcFllYXIoeWVhcikgPyAzNjYgOiAzNjU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNMZWFwWWVhcih5ZWFyKSB7XG4gICAgICAgIHJldHVybiAoeWVhciAlIDQgPT09IDAgJiYgeWVhciAlIDEwMCAhPT0gMCkgfHwgeWVhciAlIDQwMCA9PT0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja092ZXJmbG93KG0pIHtcbiAgICAgICAgdmFyIG92ZXJmbG93O1xuICAgICAgICBpZiAobS5fYSAmJiBtLl9wZi5vdmVyZmxvdyA9PT0gLTIpIHtcbiAgICAgICAgICAgIG92ZXJmbG93ID1cbiAgICAgICAgICAgICAgICBtLl9hW01PTlRIXSA8IDAgfHwgbS5fYVtNT05USF0gPiAxMSA/IE1PTlRIIDpcbiAgICAgICAgICAgICAgICBtLl9hW0RBVEVdIDwgMSB8fCBtLl9hW0RBVEVdID4gZGF5c0luTW9udGgobS5fYVtZRUFSXSwgbS5fYVtNT05USF0pID8gREFURSA6XG4gICAgICAgICAgICAgICAgbS5fYVtIT1VSXSA8IDAgfHwgbS5fYVtIT1VSXSA+IDI0IHx8XG4gICAgICAgICAgICAgICAgICAgIChtLl9hW0hPVVJdID09PSAyNCAmJiAobS5fYVtNSU5VVEVdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtTRUNPTkRdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtNSUxMSVNFQ09ORF0gIT09IDApKSA/IEhPVVIgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlOVVRFXSA8IDAgfHwgbS5fYVtNSU5VVEVdID4gNTkgPyBNSU5VVEUgOlxuICAgICAgICAgICAgICAgIG0uX2FbU0VDT05EXSA8IDAgfHwgbS5fYVtTRUNPTkRdID4gNTkgPyBTRUNPTkQgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlMTElTRUNPTkRdIDwgMCB8fCBtLl9hW01JTExJU0VDT05EXSA+IDk5OSA/IE1JTExJU0VDT05EIDpcbiAgICAgICAgICAgICAgICAtMTtcblxuICAgICAgICAgICAgaWYgKG0uX3BmLl9vdmVyZmxvd0RheU9mWWVhciAmJiAob3ZlcmZsb3cgPCBZRUFSIHx8IG92ZXJmbG93ID4gREFURSkpIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdyA9IERBVEU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93ID0gb3ZlcmZsb3c7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkKG0pIHtcbiAgICAgICAgaWYgKG0uX2lzVmFsaWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgbS5faXNWYWxpZCA9ICFpc05hTihtLl9kLmdldFRpbWUoKSkgJiZcbiAgICAgICAgICAgICAgICBtLl9wZi5vdmVyZmxvdyA8IDAgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuZW1wdHkgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuaW52YWxpZE1vbnRoICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkRm9ybWF0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLnVzZXJJbnZhbGlkYXRlZDtcblxuICAgICAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgICAgIG0uX2lzVmFsaWQgPSBtLl9pc1ZhbGlkICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmNoYXJzTGVmdE92ZXIgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi5iaWdIb3VyID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX2lzVmFsaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplTG9jYWxlKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID8ga2V5LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnXycsICctJykgOiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcGljayB0aGUgbG9jYWxlIGZyb20gdGhlIGFycmF5XG4gICAgLy8gdHJ5IFsnZW4tYXUnLCAnZW4tZ2InXSBhcyAnZW4tYXUnLCAnZW4tZ2InLCAnZW4nLCBhcyBpbiBtb3ZlIHRocm91Z2ggdGhlIGxpc3QgdHJ5aW5nIGVhY2hcbiAgICAvLyBzdWJzdHJpbmcgZnJvbSBtb3N0IHNwZWNpZmljIHRvIGxlYXN0LCBidXQgbW92ZSB0byB0aGUgbmV4dCBhcnJheSBpdGVtIGlmIGl0J3MgYSBtb3JlIHNwZWNpZmljIHZhcmlhbnQgdGhhbiB0aGUgY3VycmVudCByb290XG4gICAgZnVuY3Rpb24gY2hvb3NlTG9jYWxlKG5hbWVzKSB7XG4gICAgICAgIHZhciBpID0gMCwgaiwgbmV4dCwgbG9jYWxlLCBzcGxpdDtcblxuICAgICAgICB3aGlsZSAoaSA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgc3BsaXQgPSBub3JtYWxpemVMb2NhbGUobmFtZXNbaV0pLnNwbGl0KCctJyk7XG4gICAgICAgICAgICBqID0gc3BsaXQubGVuZ3RoO1xuICAgICAgICAgICAgbmV4dCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpICsgMV0pO1xuICAgICAgICAgICAgbmV4dCA9IG5leHQgPyBuZXh0LnNwbGl0KCctJykgOiBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKGogPiAwKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShzcGxpdC5zbGljZSgwLCBqKS5qb2luKCctJykpO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5sZW5ndGggPj0gaiAmJiBjb21wYXJlQXJyYXlzKHNwbGl0LCBuZXh0LCB0cnVlKSA+PSBqIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZExvY2FsZShuYW1lKSB7XG4gICAgICAgIHZhciBvbGRMb2NhbGUgPSBudWxsO1xuICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0gJiYgaGFzTW9kdWxlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9sZExvY2FsZSA9IG1vbWVudC5sb2NhbGUoKTtcbiAgICAgICAgICAgICAgICByZXF1aXJlKCcuL2xvY2FsZS8nICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBkZWZpbmVMb2NhbGUgY3VycmVudGx5IGFsc28gc2V0cyB0aGUgZ2xvYmFsIGxvY2FsZSwgd2Ugd2FudCB0byB1bmRvIHRoYXQgZm9yIGxhenkgbG9hZGVkIGxvY2FsZXNcbiAgICAgICAgICAgICAgICBtb21lbnQubG9jYWxlKG9sZExvY2FsZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBtb21lbnQgZnJvbSBpbnB1dCwgdGhhdCBpcyBsb2NhbC91dGMvem9uZSBlcXVpdmFsZW50IHRvIG1vZGVsLlxuICAgIGZ1bmN0aW9uIG1ha2VBcyhpbnB1dCwgbW9kZWwpIHtcbiAgICAgICAgdmFyIHJlcywgZGlmZjtcbiAgICAgICAgaWYgKG1vZGVsLl9pc1VUQykge1xuICAgICAgICAgICAgcmVzID0gbW9kZWwuY2xvbmUoKTtcbiAgICAgICAgICAgIGRpZmYgPSAobW9tZW50LmlzTW9tZW50KGlucHV0KSB8fCBpc0RhdGUoaW5wdXQpID9cbiAgICAgICAgICAgICAgICAgICAgK2lucHV0IDogK21vbWVudChpbnB1dCkpIC0gKCtyZXMpO1xuICAgICAgICAgICAgLy8gVXNlIGxvdy1sZXZlbCBhcGksIGJlY2F1c2UgdGhpcyBmbiBpcyBsb3ctbGV2ZWwgYXBpLlxuICAgICAgICAgICAgcmVzLl9kLnNldFRpbWUoK3Jlcy5fZCArIGRpZmYpO1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldChyZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0KS5sb2NhbCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBMb2NhbGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChMb2NhbGUucHJvdG90eXBlLCB7XG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgdmFyIHByb3AsIGk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IGNvbmZpZ1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1snXycgKyBpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTGVuaWVudCBvcmRpbmFsIHBhcnNpbmcgYWNjZXB0cyBqdXN0IGEgbnVtYmVyIGluIGFkZGl0aW9uIHRvXG4gICAgICAgICAgICAvLyBudW1iZXIgKyAocG9zc2libHkpIHN0dWZmIGNvbWluZyBmcm9tIF9vcmRpbmFsUGFyc2VMZW5pZW50LlxuICAgICAgICAgICAgdGhpcy5fb3JkaW5hbFBhcnNlTGVuaWVudCA9IG5ldyBSZWdFeHAodGhpcy5fb3JkaW5hbFBhcnNlLnNvdXJjZSArICd8JyArIC9cXGR7MSwyfS8uc291cmNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbW9udGhzIDogJ0phbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXInLnNwbGl0KCdfJyksXG4gICAgICAgIG1vbnRocyA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzW20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21vbnRoc1Nob3J0IDogJ0phbl9GZWJfTWFyX0Fwcl9NYXlfSnVuX0p1bF9BdWdfU2VwX09jdF9Ob3ZfRGVjJy5zcGxpdCgnXycpLFxuICAgICAgICBtb250aHNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRbbS5tb250aCgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBtb250aHNQYXJzZSA6IGZ1bmN0aW9uIChtb250aE5hbWUsIGZvcm1hdCwgc3RyaWN0KSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fc2hvcnRNb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudC51dGMoWzIwMDAsIGldKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmICF0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpLnJlcGxhY2UoJy4nLCAnJykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyaWN0ICYmICF0aGlzLl9tb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnTU1NTScgJiYgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU0nICYmIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCAmJiB0aGlzLl9tb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5cyA6ICdTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheScuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c1Nob3J0IDogJ1N1bl9Nb25fVHVlX1dlZF9UaHVfRnJpX1NhdCcuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNTaG9ydFttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXNNaW4gOiAnU3VfTW9fVHVfV2VfVGhfRnJfU2EnLnNwbGl0KCdfJyksXG4gICAgICAgIHdlZWtkYXlzTWluIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c01pblttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrZGF5c1BhcnNlIDogZnVuY3Rpb24gKHdlZWtkYXlOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudChbMjAwMCwgMV0pLmRheShpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLndlZWtkYXlzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzTWluKG1vbSwgJycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ0RhdGVGb3JtYXQgOiB7XG4gICAgICAgICAgICBMVFMgOiAnaDptbTpzcyBBJyxcbiAgICAgICAgICAgIExUIDogJ2g6bW0gQScsXG4gICAgICAgICAgICBMIDogJ01NL0REL1lZWVknLFxuICAgICAgICAgICAgTEwgOiAnTU1NTSBELCBZWVlZJyxcbiAgICAgICAgICAgIExMTCA6ICdNTU1NIEQsIFlZWVkgTFQnLFxuICAgICAgICAgICAgTExMTCA6ICdkZGRkLCBNTU1NIEQsIFlZWVkgTFQnXG4gICAgICAgIH0sXG4gICAgICAgIGxvbmdEYXRlRm9ybWF0IDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV07XG4gICAgICAgICAgICBpZiAoIW91dHB1dCAmJiB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0pIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0ucmVwbGFjZSgvTU1NTXxNTXxERHxkZGRkL2csIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldID0gb3V0cHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1BNIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBJRTggUXVpcmtzIE1vZGUgJiBJRTcgU3RhbmRhcmRzIE1vZGUgZG8gbm90IGFsbG93IGFjY2Vzc2luZyBzdHJpbmdzIGxpa2UgYXJyYXlzXG4gICAgICAgICAgICAvLyBVc2luZyBjaGFyQXQgc2hvdWxkIGJlIG1vcmUgY29tcGF0aWJsZS5cbiAgICAgICAgICAgIHJldHVybiAoKGlucHV0ICsgJycpLnRvTG93ZXJDYXNlKCkuY2hhckF0KDApID09PSAncCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tZXJpZGllbVBhcnNlIDogL1thcF1cXC4/bT9cXC4/L2ksXG4gICAgICAgIG1lcmlkaWVtIDogZnVuY3Rpb24gKGhvdXJzLCBtaW51dGVzLCBpc0xvd2VyKSB7XG4gICAgICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ3BtJyA6ICdQTSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ2FtJyA6ICdBTSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NhbGVuZGFyIDoge1xuICAgICAgICAgICAgc2FtZURheSA6ICdbVG9kYXkgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHREYXkgOiAnW1RvbW9ycm93IGF0XSBMVCcsXG4gICAgICAgICAgICBuZXh0V2VlayA6ICdkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgbGFzdERheSA6ICdbWWVzdGVyZGF5IGF0XSBMVCcsXG4gICAgICAgICAgICBsYXN0V2VlayA6ICdbTGFzdF0gZGRkZCBbYXRdIExUJyxcbiAgICAgICAgICAgIHNhbWVFbHNlIDogJ0wnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbGVuZGFyIDogZnVuY3Rpb24gKGtleSwgbW9tLCBub3cpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9jYWxlbmRhcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicgPyBvdXRwdXQuYXBwbHkobW9tLCBbbm93XSkgOiBvdXRwdXQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlbGF0aXZlVGltZSA6IHtcbiAgICAgICAgICAgIGZ1dHVyZSA6ICdpbiAlcycsXG4gICAgICAgICAgICBwYXN0IDogJyVzIGFnbycsXG4gICAgICAgICAgICBzIDogJ2EgZmV3IHNlY29uZHMnLFxuICAgICAgICAgICAgbSA6ICdhIG1pbnV0ZScsXG4gICAgICAgICAgICBtbSA6ICclZCBtaW51dGVzJyxcbiAgICAgICAgICAgIGggOiAnYW4gaG91cicsXG4gICAgICAgICAgICBoaCA6ICclZCBob3VycycsXG4gICAgICAgICAgICBkIDogJ2EgZGF5JyxcbiAgICAgICAgICAgIGRkIDogJyVkIGRheXMnLFxuICAgICAgICAgICAgTSA6ICdhIG1vbnRoJyxcbiAgICAgICAgICAgIE1NIDogJyVkIG1vbnRocycsXG4gICAgICAgICAgICB5IDogJ2EgeWVhcicsXG4gICAgICAgICAgICB5eSA6ICclZCB5ZWFycydcbiAgICAgICAgfSxcblxuICAgICAgICByZWxhdGl2ZVRpbWUgOiBmdW5jdGlvbiAobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fcmVsYXRpdmVUaW1lW3N0cmluZ107XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicpID9cbiAgICAgICAgICAgICAgICBvdXRwdXQobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSA6XG4gICAgICAgICAgICAgICAgb3V0cHV0LnJlcGxhY2UoLyVkL2ksIG51bWJlcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFzdEZ1dHVyZSA6IGZ1bmN0aW9uIChkaWZmLCBvdXRwdXQpIHtcbiAgICAgICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbZGlmZiA+IDAgPyAnZnV0dXJlJyA6ICdwYXN0J107XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZvcm1hdCA9PT0gJ2Z1bmN0aW9uJyA/IGZvcm1hdChvdXRwdXQpIDogZm9ybWF0LnJlcGxhY2UoLyVzL2ksIG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcmRpbmFsLnJlcGxhY2UoJyVkJywgbnVtYmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgX29yZGluYWwgOiAnJWQnLFxuICAgICAgICBfb3JkaW5hbFBhcnNlIDogL1xcZHsxLDJ9LyxcblxuICAgICAgICBwcmVwYXJzZSA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9zdGZvcm1hdCA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrIDoge1xuICAgICAgICAgICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgICAgICAgICBkb3kgOiA2ICAvLyBUaGUgd2VlayB0aGF0IGNvbnRhaW5zIEphbiAxc3QgaXMgdGhlIGZpcnN0IHdlZWsgb2YgdGhlIHllYXIuXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2ludmFsaWREYXRlOiAnSW52YWxpZCBkYXRlJyxcbiAgICAgICAgaW52YWxpZERhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnZhbGlkRGF0ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBGb3JtYXR0aW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGlucHV0KSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaCgvXFxbW1xcc1xcU10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL1xcXFwvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gZm9ybWF0Lm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpLCBpLCBsZW5ndGg7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV0pIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobW9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gYXJyYXlbaV0gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGZvcm1hdCBkYXRlIHVzaW5nIG5hdGl2ZSBkYXRlIG9iamVjdFxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcbiAgICAgICAgaWYgKCFtLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG0ubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3JtYXQgPSBleHBhbmRGb3JtYXQoZm9ybWF0LCBtLmxvY2FsZURhdGEoKSk7XG5cbiAgICAgICAgaWYgKCFmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSkge1xuICAgICAgICAgICAgZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0gPSBtYWtlRm9ybWF0RnVuY3Rpb24oZm9ybWF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XShtKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBhbmRGb3JtYXQoZm9ybWF0LCBsb2NhbGUpIHtcbiAgICAgICAgdmFyIGkgPSA1O1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2VucyhpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZS5sb25nRGF0ZUZvcm1hdChpbnB1dCkgfHwgaW5wdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgd2hpbGUgKGkgPj0gMCAmJiBsb2NhbEZvcm1hdHRpbmdUb2tlbnMudGVzdChmb3JtYXQpKSB7XG4gICAgICAgICAgICBmb3JtYXQgPSBmb3JtYXQucmVwbGFjZShsb2NhbEZvcm1hdHRpbmdUb2tlbnMsIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2Vucyk7XG4gICAgICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgIGkgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFBhcnNpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGdldCB0aGUgcmVnZXggdG8gZmluZCB0aGUgbmV4dCB0b2tlblxuICAgIGZ1bmN0aW9uIGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBzdHJpY3QgPSBjb25maWcuX3N0cmljdDtcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgIGNhc2UgJ0REREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0cnOlxuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuRm91ckRpZ2l0cyA6IHBhcnNlVG9rZW5PbmVUb0ZvdXJEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1knOlxuICAgICAgICBjYXNlICdHJzpcbiAgICAgICAgY2FzZSAnZyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblNpZ25lZE51bWJlcjtcbiAgICAgICAgY2FzZSAnWVlZWVlZJzpcbiAgICAgICAgY2FzZSAnWVlZWVknOlxuICAgICAgICBjYXNlICdHR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuU2l4RGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzO1xuICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZURpZ2l0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5Ud29EaWdpdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnREREJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnTU1NJzpcbiAgICAgICAgY2FzZSAnTU1NTSc6XG4gICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgY2FzZSAnZGRkJzpcbiAgICAgICAgY2FzZSAnZGRkZCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbldvcmQ7XG4gICAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgIHJldHVybiBjb25maWcuX2xvY2FsZS5fbWVyaWRpZW1QYXJzZTtcbiAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9mZnNldE1zO1xuICAgICAgICBjYXNlICdYJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXN0YW1wTXM7XG4gICAgICAgIGNhc2UgJ1onOlxuICAgICAgICBjYXNlICdaWic6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRpbWV6b25lO1xuICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVDtcbiAgICAgICAgY2FzZSAnU1NTUyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbkRpZ2l0cztcbiAgICAgICAgY2FzZSAnTU0nOlxuICAgICAgICBjYXNlICdERCc6XG4gICAgICAgIGNhc2UgJ1lZJzpcbiAgICAgICAgY2FzZSAnR0cnOlxuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0hIJzpcbiAgICAgICAgY2FzZSAnaGgnOlxuICAgICAgICBjYXNlICdtbSc6XG4gICAgICAgIGNhc2UgJ3NzJzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXVyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlblR3b0RpZ2l0cyA6IHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnTSc6XG4gICAgICAgIGNhc2UgJ0QnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgIGNhc2UgJ2gnOlxuICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnRG8nOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IGNvbmZpZy5fbG9jYWxlLl9vcmRpbmFsUGFyc2UgOiBjb25maWcuX2xvY2FsZS5fb3JkaW5hbFBhcnNlTGVuaWVudDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICBhID0gbmV3IFJlZ0V4cChyZWdleHBFc2NhcGUodW5lc2NhcGVGb3JtYXQodG9rZW4ucmVwbGFjZSgnXFxcXCcsICcnKSksICdpJykpO1xuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aW1lem9uZU1pbnV0ZXNGcm9tU3RyaW5nKHN0cmluZykge1xuICAgICAgICBzdHJpbmcgPSBzdHJpbmcgfHwgJyc7XG4gICAgICAgIHZhciBwb3NzaWJsZVR6TWF0Y2hlcyA9IChzdHJpbmcubWF0Y2gocGFyc2VUb2tlblRpbWV6b25lKSB8fCBbXSksXG4gICAgICAgICAgICB0ekNodW5rID0gcG9zc2libGVUek1hdGNoZXNbcG9zc2libGVUek1hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW10sXG4gICAgICAgICAgICBwYXJ0cyA9ICh0ekNodW5rICsgJycpLm1hdGNoKHBhcnNlVGltZXpvbmVDaHVua2VyKSB8fCBbJy0nLCAwLCAwXSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSArKHBhcnRzWzFdICogNjApICsgdG9JbnQocGFydHNbMl0pO1xuXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJysnID8gLW1pbnV0ZXMgOiBtaW51dGVzO1xuICAgIH1cblxuICAgIC8vIGZ1bmN0aW9uIHRvIGNvbnZlcnQgc3RyaW5nIGlucHV0IHRvIGRhdGVcbiAgICBmdW5jdGlvbiBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgaW5wdXQsIGNvbmZpZykge1xuICAgICAgICB2YXIgYSwgZGF0ZVBhcnRBcnJheSA9IGNvbmZpZy5fYTtcblxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIC8vIFFVQVJURVJcbiAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gKHRvSW50KGlucHV0KSAtIDEpICogMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNT05USFxuICAgICAgICBjYXNlICdNJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTVxuICAgICAgICBjYXNlICdNTScgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTU1NJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTU1NXG4gICAgICAgIGNhc2UgJ01NTU0nIDpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS5tb250aHNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBmaW5kIGEgbW9udGggbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkLlxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkTW9udGggPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgTU9OVEhcbiAgICAgICAgY2FzZSAnRCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gRERcbiAgICAgICAgY2FzZSAnREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtEQVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdEbycgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQocGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQubWF0Y2goL1xcZHsxLDJ9LylbMF0sIDEwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gREFZIE9GIFlFQVJcbiAgICAgICAgY2FzZSAnREREJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBEREREXG4gICAgICAgIGNhc2UgJ0REREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBZRUFSXG4gICAgICAgIGNhc2UgJ1lZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZWScgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtZRUFSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBBTSAvIFBNXG4gICAgICAgIGNhc2UgJ2EnIDogLy8gZmFsbCB0aHJvdWdoIHRvIEFcbiAgICAgICAgY2FzZSAnQScgOlxuICAgICAgICAgICAgY29uZmlnLl9pc1BtID0gY29uZmlnLl9sb2NhbGUuaXNQTShpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gSE9VUlxuICAgICAgICBjYXNlICdoJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdoaCcgOlxuICAgICAgICAgICAgY29uZmlnLl9wZi5iaWdIb3VyID0gdHJ1ZTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnSCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gSEhcbiAgICAgICAgY2FzZSAnSEgnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlOVVRFXG4gICAgICAgIGNhc2UgJ20nIDogLy8gZmFsbCB0aHJvdWdoIHRvIG1tXG4gICAgICAgIGNhc2UgJ21tJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTlVURV0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gU0VDT05EXG4gICAgICAgIGNhc2UgJ3MnIDogLy8gZmFsbCB0aHJvdWdoIHRvIHNzXG4gICAgICAgIGNhc2UgJ3NzJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1NFQ09ORF0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlMTElTRUNPTkRcbiAgICAgICAgY2FzZSAnUycgOlxuICAgICAgICBjYXNlICdTUycgOlxuICAgICAgICBjYXNlICdTU1MnIDpcbiAgICAgICAgY2FzZSAnU1NTUycgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNSUxMSVNFQ09ORF0gPSB0b0ludCgoJzAuJyArIGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggT0ZGU0VUIChNSUxMSVNFQ09ORFMpXG4gICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUodG9JbnQoaW5wdXQpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBVTklYIFRJTUVTVEFNUCBXSVRIIE1TXG4gICAgICAgIGNhc2UgJ1gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUocGFyc2VGbG9hdChpbnB1dCkgKiAxMDAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBUSU1FWk9ORVxuICAgICAgICBjYXNlICdaJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBaWlxuICAgICAgICBjYXNlICdaWicgOlxuICAgICAgICAgICAgY29uZmlnLl91c2VVVEMgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl90em0gPSB0aW1lem9uZU1pbnV0ZXNGcm9tU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLREFZIC0gaHVtYW5cbiAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICBjYXNlICdkZGQnOlxuICAgICAgICBjYXNlICdkZGRkJzpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBnZXQgYSB3ZWVrZGF5IG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZFxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgICAgICBjb25maWcuX3dbJ2QnXSA9IGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZFdlZWtkYXkgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLLCBXRUVLIERBWSAtIG51bWVyaWNcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ3d3JzpcbiAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgIGNhc2UgJ2UnOlxuICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDIpO1xuICAgICAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZ2cnOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICBjb25maWcuX3dbdG9rZW5dID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpIHtcbiAgICAgICAgdmFyIHcsIHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3csIGRveSwgdGVtcDtcblxuICAgICAgICB3ID0gY29uZmlnLl93O1xuICAgICAgICBpZiAody5HRyAhPSBudWxsIHx8IHcuVyAhPSBudWxsIHx8IHcuRSAhPSBudWxsKSB7XG4gICAgICAgICAgICBkb3cgPSAxO1xuICAgICAgICAgICAgZG95ID0gNDtcblxuICAgICAgICAgICAgLy8gVE9ETzogV2UgbmVlZCB0byB0YWtlIHRoZSBjdXJyZW50IGlzb1dlZWtZZWFyLCBidXQgdGhhdCBkZXBlbmRzIG9uXG4gICAgICAgICAgICAvLyBob3cgd2UgaW50ZXJwcmV0IG5vdyAobG9jYWwsIHV0YywgZml4ZWQgb2Zmc2V0KS4gU28gY3JlYXRlXG4gICAgICAgICAgICAvLyBhIG5vdyB2ZXJzaW9uIG9mIGN1cnJlbnQgY29uZmlnICh0YWtlIGxvY2FsL3V0Yy9vZmZzZXQgZmxhZ3MsIGFuZFxuICAgICAgICAgICAgLy8gY3JlYXRlIG5vdykuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIDEsIDQpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LlcsIDEpO1xuICAgICAgICAgICAgd2Vla2RheSA9IGRmbCh3LkUsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG93ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG93O1xuICAgICAgICAgICAgZG95ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG95O1xuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LmdnLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIGRvdywgZG95KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZmwody53LCAxKTtcblxuICAgICAgICAgICAgaWYgKHcuZCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gd2Vla2RheSAtLSBsb3cgZGF5IG51bWJlcnMgYXJlIGNvbnNpZGVyZWQgbmV4dCB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZDtcbiAgICAgICAgICAgICAgICBpZiAod2Vla2RheSA8IGRvdykge1xuICAgICAgICAgICAgICAgICAgICArK3dlZWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3LmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsIHdlZWtkYXkgLS0gY291bnRpbmcgc3RhcnRzIGZyb20gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSB3LmUgKyBkb3c7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSBkb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGVtcCA9IGRheU9mWWVhckZyb21XZWVrcyh3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG95LCBkb3cpO1xuXG4gICAgICAgIGNvbmZpZy5fYVtZRUFSXSA9IHRlbXAueWVhcjtcbiAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0ZW1wLmRheU9mWWVhcjtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IGFuIGFycmF5IHRvIGEgZGF0ZS5cbiAgICAvLyB0aGUgYXJyYXkgc2hvdWxkIG1pcnJvciB0aGUgcGFyYW1ldGVycyBiZWxvd1xuICAgIC8vIG5vdGU6IGFsbCB2YWx1ZXMgcGFzdCB0aGUgeWVhciBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgZGVmYXVsdCB0byB0aGUgbG93ZXN0IHBvc3NpYmxlIHZhbHVlLlxuICAgIC8vIFt5ZWFyLCBtb250aCwgZGF5ICwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kXVxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tQ29uZmlnKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgZGF0ZSwgaW5wdXQgPSBbXSwgY3VycmVudERhdGUsIHllYXJUb1VzZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKTtcblxuICAgICAgICAvL2NvbXB1dGUgZGF5IG9mIHRoZSB5ZWFyIGZyb20gd2Vla3MgYW5kIHdlZWtkYXlzXG4gICAgICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIpIHtcbiAgICAgICAgICAgIHllYXJUb1VzZSA9IGRmbChjb25maWcuX2FbWUVBUl0sIGN1cnJlbnREYXRlW1lFQVJdKTtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5fZGF5T2ZZZWFyID4gZGF5c0luWWVhcih5ZWFyVG9Vc2UpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5fb3ZlcmZsb3dEYXlPZlllYXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRlID0gbWFrZVVUQ0RhdGUoeWVhclRvVXNlLCAwLCBjb25maWcuX2RheU9mWWVhcik7XG4gICAgICAgICAgICBjb25maWcuX2FbTU9OVEhdID0gZGF0ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgY29uZmlnLl9hW0RBVEVdID0gZGF0ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZGF0ZS5cbiAgICAgICAgLy8gKiBpZiBubyB5ZWFyLCBtb250aCwgZGF5IG9mIG1vbnRoIGFyZSBnaXZlbiwgZGVmYXVsdCB0byB0b2RheVxuICAgICAgICAvLyAqIGlmIGRheSBvZiBtb250aCBpcyBnaXZlbiwgZGVmYXVsdCBtb250aCBhbmQgeWVhclxuICAgICAgICAvLyAqIGlmIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG9ubHkgeWVhclxuICAgICAgICAvLyAqIGlmIHllYXIgaXMgZ2l2ZW4sIGRvbid0IGRlZmF1bHQgYW55dGhpbmdcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDMgJiYgY29uZmlnLl9hW2ldID09IG51bGw7ICsraSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSBjdXJyZW50RGF0ZVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFplcm8gb3V0IHdoYXRldmVyIHdhcyBub3QgZGVmYXVsdGVkLCBpbmNsdWRpbmcgdGltZVxuICAgICAgICBmb3IgKDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSAoY29uZmlnLl9hW2ldID09IG51bGwpID8gKGkgPT09IDIgPyAxIDogMCkgOiBjb25maWcuX2FbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgMjQ6MDA6MDAuMDAwXG4gICAgICAgIGlmIChjb25maWcuX2FbSE9VUl0gPT09IDI0ICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTlVURV0gPT09IDAgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbU0VDT05EXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtNSUxMSVNFQ09ORF0gPT09IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fbmV4dERheSA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9kID0gKGNvbmZpZy5fdXNlVVRDID8gbWFrZVVUQ0RhdGUgOiBtYWtlRGF0ZSkuYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgICAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB6b25lIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgIC8vIHdpdGggcGFyc2Vab25lLlxuICAgICAgICBpZiAoY29uZmlnLl90em0gIT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9kLnNldFVUQ01pbnV0ZXMoY29uZmlnLl9kLmdldFVUQ01pbnV0ZXMoKSArIGNvbmZpZy5fdHptKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcuX25leHREYXkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDI0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF0ZUZyb21PYmplY3QoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQ7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9ybWFsaXplZElucHV0ID0gbm9ybWFsaXplT2JqZWN0VW5pdHMoY29uZmlnLl9pKTtcbiAgICAgICAgY29uZmlnLl9hID0gW1xuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnllYXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubW9udGgsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuZGF5IHx8IG5vcm1hbGl6ZWRJbnB1dC5kYXRlLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LmhvdXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubWludXRlLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnNlY29uZCxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZFxuICAgICAgICBdO1xuXG4gICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3VycmVudERhdGVBcnJheShjb25maWcpIHtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGlmIChjb25maWcuX3VzZVVUQykge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDTW9udGgoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRGF0ZSgpXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgZm9ybWF0IHN0cmluZ1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5fZiA9PT0gbW9tZW50LklTT184NjAxKSB7XG4gICAgICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9hID0gW107XG4gICAgICAgIGNvbmZpZy5fcGYuZW1wdHkgPSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgYXJyYXkgaXMgdXNlZCB0byBtYWtlIGEgRGF0ZSwgZWl0aGVyIHdpdGggYG5ldyBEYXRlYCBvciBgRGF0ZS5VVENgXG4gICAgICAgIHZhciBzdHJpbmcgPSAnJyArIGNvbmZpZy5faSxcbiAgICAgICAgICAgIGksIHBhcnNlZElucHV0LCB0b2tlbnMsIHRva2VuLCBza2lwcGVkLFxuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGggPSAwO1xuXG4gICAgICAgIHRva2VucyA9IGV4cGFuZEZvcm1hdChjb25maWcuX2YsIGNvbmZpZy5fbG9jYWxlKS5tYXRjaChmb3JtYXR0aW5nVG9rZW5zKSB8fCBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIHBhcnNlZElucHV0ID0gKHN0cmluZy5tYXRjaChnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4odG9rZW4sIGNvbmZpZykpIHx8IFtdKVswXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIHNraXBwZWQgPSBzdHJpbmcuc3Vic3RyKDAsIHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSk7XG4gICAgICAgICAgICAgICAgaWYgKHNraXBwZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZElucHV0LnB1c2goc2tpcHBlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZShzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkgKyBwYXJzZWRJbnB1dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGggKz0gcGFyc2VkSW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZG9uJ3QgcGFyc2UgaWYgaXQncyBub3QgYSBrbm93biB0b2tlblxuICAgICAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW3Rva2VuXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLmVtcHR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIHBhcnNlZElucHV0LCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY29uZmlnLl9zdHJpY3QgJiYgIXBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgcmVtYWluaW5nIHVucGFyc2VkIGlucHV0IGxlbmd0aCB0byB0aGUgc3RyaW5nXG4gICAgICAgIGNvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlciA9IHN0cmluZ0xlbmd0aCAtIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGg7XG4gICAgICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRJbnB1dC5wdXNoKHN0cmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjbGVhciBfMTJoIGZsYWcgaWYgaG91ciBpcyA8PSAxMlxuICAgICAgICBpZiAoY29uZmlnLl9wZi5iaWdIb3VyID09PSB0cnVlICYmIGNvbmZpZy5fYVtIT1VSXSA8PSAxMikge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5iaWdIb3VyID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIGhhbmRsZSBhbSBwbVxuICAgICAgICBpZiAoY29uZmlnLl9pc1BtICYmIGNvbmZpZy5fYVtIT1VSXSA8IDEyKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gKz0gMTI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgaXMgMTIgYW0sIGNoYW5nZSBob3VycyB0byAwXG4gICAgICAgIGlmIChjb25maWcuX2lzUG0gPT09IGZhbHNlICYmIGNvbmZpZy5fYVtIT1VSXSA9PT0gMTIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuZXNjYXBlRm9ybWF0KHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLCBmdW5jdGlvbiAobWF0Y2hlZCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgICAgIHJldHVybiBwMSB8fCBwMiB8fCBwMyB8fCBwNDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ29kZSBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzU2MTQ5My9pcy10aGVyZS1hLXJlZ2V4cC1lc2NhcGUtZnVuY3Rpb24taW4tamF2YXNjcmlwdFxuICAgIGZ1bmN0aW9uIHJlZ2V4cEVzY2FwZShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGFycmF5IG9mIGZvcm1hdCBzdHJpbmdzXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciB0ZW1wQ29uZmlnLFxuICAgICAgICAgICAgYmVzdE1vbWVudCxcblxuICAgICAgICAgICAgc2NvcmVUb0JlYXQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgY3VycmVudFNjb3JlO1xuXG4gICAgICAgIGlmIChjb25maWcuX2YubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRGb3JtYXQgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoTmFOKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb25maWcuX2YubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSA9IDA7XG4gICAgICAgICAgICB0ZW1wQ29uZmlnID0gY29weUNvbmZpZyh7fSwgY29uZmlnKTtcbiAgICAgICAgICAgIGlmIChjb25maWcuX3VzZVVUQyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGVtcENvbmZpZy5fdXNlVVRDID0gY29uZmlnLl91c2VVVEM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcbiAgICAgICAgICAgIHRlbXBDb25maWcuX2YgPSBjb25maWcuX2ZbaV07XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQodGVtcENvbmZpZyk7XG5cbiAgICAgICAgICAgIGlmICghaXNWYWxpZCh0ZW1wQ29uZmlnKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBhbnkgaW5wdXQgdGhhdCB3YXMgbm90IHBhcnNlZCBhZGQgYSBwZW5hbHR5IGZvciB0aGF0IGZvcm1hdFxuICAgICAgICAgICAgY3VycmVudFNjb3JlICs9IHRlbXBDb25maWcuX3BmLmNoYXJzTGVmdE92ZXI7XG5cbiAgICAgICAgICAgIC8vb3IgdG9rZW5zXG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gdGVtcENvbmZpZy5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCAqIDEwO1xuXG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9wZi5zY29yZSA9IGN1cnJlbnRTY29yZTtcblxuICAgICAgICAgICAgaWYgKHNjb3JlVG9CZWF0ID09IG51bGwgfHwgY3VycmVudFNjb3JlIDwgc2NvcmVUb0JlYXQpIHtcbiAgICAgICAgICAgICAgICBzY29yZVRvQmVhdCA9IGN1cnJlbnRTY29yZTtcbiAgICAgICAgICAgICAgICBiZXN0TW9tZW50ID0gdGVtcENvbmZpZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuZChjb25maWcsIGJlc3RNb21lbnQgfHwgdGVtcENvbmZpZyk7XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIGlzbyBmb3JtYXRcbiAgICBmdW5jdGlvbiBwYXJzZUlTTyhjb25maWcpIHtcbiAgICAgICAgdmFyIGksIGwsXG4gICAgICAgICAgICBzdHJpbmcgPSBjb25maWcuX2ksXG4gICAgICAgICAgICBtYXRjaCA9IGlzb1JlZ2V4LmV4ZWMoc3RyaW5nKTtcblxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYuaXNvID0gdHJ1ZTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29EYXRlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvRGF0ZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoWzVdIHNob3VsZCBiZSAnVCcgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiA9IGlzb0RhdGVzW2ldWzBdICsgKG1hdGNoWzZdIHx8ICcgJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29UaW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvVGltZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSBpc29UaW1lc1tpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0cmluZy5tYXRjaChwYXJzZVRva2VuVGltZXpvbmUpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9mICs9ICdaJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uZmlnLl9pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdCBvciBmYWxsYmFja1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZyhjb25maWcpIHtcbiAgICAgICAgcGFyc2VJU08oY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZy5faXNWYWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjb25maWcuX2lzVmFsaWQ7XG4gICAgICAgICAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcChhcnIsIGZuKSB7XG4gICAgICAgIHZhciByZXMgPSBbXSwgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzLnB1c2goZm4oYXJyW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLCBtYXRjaGVkO1xuICAgICAgICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RhdGUoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgraW5wdXQpO1xuICAgICAgICB9IGVsc2UgaWYgKChtYXRjaGVkID0gYXNwTmV0SnNvblJlZ2V4LmV4ZWMoaW5wdXQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK21hdGNoZWRbMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZyhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2EgPSBtYXAoaW5wdXQuc2xpY2UoMCksIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQob2JqLCAxMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKGlucHV0KSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRhdGVGcm9tT2JqZWN0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKGlucHV0KSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIC8vIGZyb20gbWlsbGlzZWNvbmRzXG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShpbnB1dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VEYXRlKHksIG0sIGQsIGgsIE0sIHMsIG1zKSB7XG4gICAgICAgIC8vY2FuJ3QganVzdCBhcHBseSgpIHRvIGNyZWF0ZSBhIGRhdGU6XG4gICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODEzNDgvaW5zdGFudGlhdGluZy1hLWphdmFzY3JpcHQtb2JqZWN0LWJ5LWNhbGxpbmctcHJvdG90eXBlLWNvbnN0cnVjdG9yLWFwcGx5XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpO1xuXG4gICAgICAgIC8vdGhlIGRhdGUgY29uc3RydWN0b3IgZG9lc24ndCBhY2NlcHQgeWVhcnMgPCAxOTcwXG4gICAgICAgIGlmICh5IDwgMTk3MCkge1xuICAgICAgICAgICAgZGF0ZS5zZXRGdWxsWWVhcih5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlVVRDRGF0ZSh5KSB7XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgICAgIGlmICh5IDwgMTk3MCkge1xuICAgICAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcih5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdlZWtkYXkoaW5wdXQsIGxvY2FsZSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKCFpc05hTihpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlSW50KGlucHV0LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IGxvY2FsZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgUmVsYXRpdmUgVGltZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gaGVscGVyIGZ1bmN0aW9uIGZvciBtb21lbnQuZm4uZnJvbSwgbW9tZW50LmZuLmZyb21Ob3csIGFuZCBtb21lbnQuZHVyYXRpb24uZm4uaHVtYW5pemVcbiAgICBmdW5jdGlvbiBzdWJzdGl0dXRlVGltZUFnbyhzdHJpbmcsIG51bWJlciwgd2l0aG91dFN1ZmZpeCwgaXNGdXR1cmUsIGxvY2FsZSkge1xuICAgICAgICByZXR1cm4gbG9jYWxlLnJlbGF0aXZlVGltZShudW1iZXIgfHwgMSwgISF3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWxhdGl2ZVRpbWUocG9zTmVnRHVyYXRpb24sIHdpdGhvdXRTdWZmaXgsIGxvY2FsZSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24ocG9zTmVnRHVyYXRpb24pLmFicygpLFxuICAgICAgICAgICAgc2Vjb25kcyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdzJykpLFxuICAgICAgICAgICAgbWludXRlcyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdtJykpLFxuICAgICAgICAgICAgaG91cnMgPSByb3VuZChkdXJhdGlvbi5hcygnaCcpKSxcbiAgICAgICAgICAgIGRheXMgPSByb3VuZChkdXJhdGlvbi5hcygnZCcpKSxcbiAgICAgICAgICAgIG1vbnRocyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdNJykpLFxuICAgICAgICAgICAgeWVhcnMgPSByb3VuZChkdXJhdGlvbi5hcygneScpKSxcblxuICAgICAgICAgICAgYXJncyA9IHNlY29uZHMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLnMgJiYgWydzJywgc2Vjb25kc10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzID09PSAxICYmIFsnbSddIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMubSAmJiBbJ21tJywgbWludXRlc10gfHxcbiAgICAgICAgICAgICAgICBob3VycyA9PT0gMSAmJiBbJ2gnXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5oICYmIFsnaGgnLCBob3Vyc10gfHxcbiAgICAgICAgICAgICAgICBkYXlzID09PSAxICYmIFsnZCddIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuZCAmJiBbJ2RkJywgZGF5c10gfHxcbiAgICAgICAgICAgICAgICBtb250aHMgPT09IDEgJiYgWydNJ10gfHxcbiAgICAgICAgICAgICAgICBtb250aHMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLk0gJiYgWydNTScsIG1vbnRoc10gfHxcbiAgICAgICAgICAgICAgICB5ZWFycyA9PT0gMSAmJiBbJ3knXSB8fCBbJ3l5JywgeWVhcnNdO1xuXG4gICAgICAgIGFyZ3NbMl0gPSB3aXRob3V0U3VmZml4O1xuICAgICAgICBhcmdzWzNdID0gK3Bvc05lZ0R1cmF0aW9uID4gMDtcbiAgICAgICAgYXJnc1s0XSA9IGxvY2FsZTtcbiAgICAgICAgcmV0dXJuIHN1YnN0aXR1dGVUaW1lQWdvLmFwcGx5KHt9LCBhcmdzKTtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgV2VlayBvZiBZZWFyXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBmaXJzdERheU9mV2VlayAgICAgICAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGRheSBvZiB0aGUgd2VlayB0aGF0IHN0YXJ0cyB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICh1c3VhbGx5IHN1bmRheSBvciBtb25kYXkpXG4gICAgLy8gZmlyc3REYXlPZldlZWtPZlllYXIgMCA9IHN1biwgNiA9IHNhdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBmaXJzdCB3ZWVrIGlzIHRoZSB3ZWVrIHRoYXQgY29udGFpbnMgdGhlIGZpcnN0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgb2YgdGhpcyBkYXkgb2YgdGhlIHdlZWtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAoZWcuIElTTyB3ZWVrcyB1c2UgdGh1cnNkYXkgKDQpKVxuICAgIGZ1bmN0aW9uIHdlZWtPZlllYXIobW9tLCBmaXJzdERheU9mV2VlaywgZmlyc3REYXlPZldlZWtPZlllYXIpIHtcbiAgICAgICAgdmFyIGVuZCA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gZmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgPSBmaXJzdERheU9mV2Vla09mWWVhciAtIG1vbS5kYXkoKSxcbiAgICAgICAgICAgIGFkanVzdGVkTW9tZW50O1xuXG5cbiAgICAgICAgaWYgKGRheXNUb0RheU9mV2VlayA+IGVuZCkge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrIC09IDc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrIDwgZW5kIC0gNykge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrICs9IDc7XG4gICAgICAgIH1cblxuICAgICAgICBhZGp1c3RlZE1vbWVudCA9IG1vbWVudChtb20pLmFkZChkYXlzVG9EYXlPZldlZWssICdkJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3ZWVrOiBNYXRoLmNlaWwoYWRqdXN0ZWRNb21lbnQuZGF5T2ZZZWFyKCkgLyA3KSxcbiAgICAgICAgICAgIHllYXI6IGFkanVzdGVkTW9tZW50LnllYXIoKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9JU09fd2Vla19kYXRlI0NhbGN1bGF0aW5nX2FfZGF0ZV9naXZlbl90aGVfeWVhci4yQ193ZWVrX251bWJlcl9hbmRfd2Vla2RheVxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrcyh5ZWFyLCB3ZWVrLCB3ZWVrZGF5LCBmaXJzdERheU9mV2Vla09mWWVhciwgZmlyc3REYXlPZldlZWspIHtcbiAgICAgICAgdmFyIGQgPSBtYWtlVVRDRGF0ZSh5ZWFyLCAwLCAxKS5nZXRVVENEYXkoKSwgZGF5c1RvQWRkLCBkYXlPZlllYXI7XG5cbiAgICAgICAgZCA9IGQgPT09IDAgPyA3IDogZDtcbiAgICAgICAgd2Vla2RheSA9IHdlZWtkYXkgIT0gbnVsbCA/IHdlZWtkYXkgOiBmaXJzdERheU9mV2VlaztcbiAgICAgICAgZGF5c1RvQWRkID0gZmlyc3REYXlPZldlZWsgLSBkICsgKGQgPiBmaXJzdERheU9mV2Vla09mWWVhciA/IDcgOiAwKSAtIChkIDwgZmlyc3REYXlPZldlZWsgPyA3IDogMCk7XG4gICAgICAgIGRheU9mWWVhciA9IDcgKiAod2VlayAtIDEpICsgKHdlZWtkYXkgLSBmaXJzdERheU9mV2VlaykgKyBkYXlzVG9BZGQgKyAxO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB5ZWFyOiBkYXlPZlllYXIgPiAwID8geWVhciA6IHllYXIgLSAxLFxuICAgICAgICAgICAgZGF5T2ZZZWFyOiBkYXlPZlllYXIgPiAwID8gIGRheU9mWWVhciA6IGRheXNJblllYXIoeWVhciAtIDEpICsgZGF5T2ZZZWFyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBUb3AgTGV2ZWwgRnVuY3Rpb25zXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZU1vbWVudChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgZm9ybWF0ID0gY29uZmlnLl9mLFxuICAgICAgICAgICAgcmVzO1xuXG4gICAgICAgIGNvbmZpZy5fbG9jYWxlID0gY29uZmlnLl9sb2NhbGUgfHwgbW9tZW50LmxvY2FsZURhdGEoY29uZmlnLl9sKTtcblxuICAgICAgICBpZiAoaW5wdXQgPT09IG51bGwgfHwgKGZvcm1hdCA9PT0gdW5kZWZpbmVkICYmIGlucHV0ID09PSAnJykpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuaW52YWxpZCh7bnVsbElucHV0OiB0cnVlfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uZmlnLl9pID0gaW5wdXQgPSBjb25maWcuX2xvY2FsZS5wcmVwYXJzZShpbnB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9tZW50LmlzTW9tZW50KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNb21lbnQoaW5wdXQsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCkge1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkoZm9ybWF0KSkge1xuICAgICAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEFycmF5KGNvbmZpZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tSW5wdXQoY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IG5ldyBNb21lbnQoY29uZmlnKTtcbiAgICAgICAgaWYgKHJlcy5fbmV4dERheSkge1xuICAgICAgICAgICAgLy8gQWRkaW5nIGlzIHNtYXJ0IGVub3VnaCBhcm91bmQgRFNUXG4gICAgICAgICAgICByZXMuYWRkKDEsICdkJyk7XG4gICAgICAgICAgICByZXMuX25leHREYXkgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIG1vbWVudCA9IGZ1bmN0aW9uIChpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCkge1xuICAgICAgICB2YXIgYztcblxuICAgICAgICBpZiAodHlwZW9mKGxvY2FsZSkgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgc3RyaWN0ID0gbG9jYWxlO1xuICAgICAgICAgICAgbG9jYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9iamVjdCBjb25zdHJ1Y3Rpb24gbXVzdCBiZSBkb25lIHRoaXMgd2F5LlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQyM1xuICAgICAgICBjID0ge307XG4gICAgICAgIGMuX2lzQU1vbWVudE9iamVjdCA9IHRydWU7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fbCA9IGxvY2FsZTtcbiAgICAgICAgYy5fc3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBjLl9pc1VUQyA9IGZhbHNlO1xuICAgICAgICBjLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcblxuICAgICAgICByZXR1cm4gbWFrZU1vbWVudChjKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9IGZhbHNlO1xuXG4gICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrID0gZGVwcmVjYXRlKFxuICAgICAgICAnbW9tZW50IGNvbnN0cnVjdGlvbiBmYWxscyBiYWNrIHRvIGpzIERhdGUuIFRoaXMgaXMgJyArXG4gICAgICAgICdkaXNjb3VyYWdlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHVwY29taW5nIG1ham9yICcgK1xuICAgICAgICAncmVsZWFzZS4gUGxlYXNlIHJlZmVyIHRvICcgK1xuICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MDcgZm9yIG1vcmUgaW5mby4nLFxuICAgICAgICBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShjb25maWcuX2kgKyAoY29uZmlnLl91c2VVVEMgPyAnIFVUQycgOiAnJykpO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIFBpY2sgYSBtb21lbnQgbSBmcm9tIG1vbWVudHMgc28gdGhhdCBtW2ZuXShvdGhlcikgaXMgdHJ1ZSBmb3IgYWxsXG4gICAgLy8gb3RoZXIuIFRoaXMgcmVsaWVzIG9uIHRoZSBmdW5jdGlvbiBmbiB0byBiZSB0cmFuc2l0aXZlLlxuICAgIC8vXG4gICAgLy8gbW9tZW50cyBzaG91bGQgZWl0aGVyIGJlIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzIG9yIGFuIGFycmF5LCB3aG9zZVxuICAgIC8vIGZpcnN0IGVsZW1lbnQgaXMgYW4gYXJyYXkgb2YgbW9tZW50IG9iamVjdHMuXG4gICAgZnVuY3Rpb24gcGlja0J5KGZuLCBtb21lbnRzKSB7XG4gICAgICAgIHZhciByZXMsIGk7XG4gICAgICAgIGlmIChtb21lbnRzLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5KG1vbWVudHNbMF0pKSB7XG4gICAgICAgICAgICBtb21lbnRzID0gbW9tZW50c1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1vbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gbW9tZW50c1swXTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IG1vbWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtb21lbnRzW2ldW2ZuXShyZXMpKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gbW9tZW50c1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIG1vbWVudC5taW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQmVmb3JlJywgYXJncyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5tYXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQWZ0ZXInLCBhcmdzKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1dGNcbiAgICBtb21lbnQudXRjID0gZnVuY3Rpb24gKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgICAgIHZhciBjO1xuXG4gICAgICAgIGlmICh0eXBlb2YobG9jYWxlKSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBzdHJpY3QgPSBsb2NhbGU7XG4gICAgICAgICAgICBsb2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDIzXG4gICAgICAgIGMgPSB7fTtcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5fdXNlVVRDID0gdHJ1ZTtcbiAgICAgICAgYy5faXNVVEMgPSB0cnVlO1xuICAgICAgICBjLl9sID0gbG9jYWxlO1xuICAgICAgICBjLl9pID0gaW5wdXQ7XG4gICAgICAgIGMuX2YgPSBmb3JtYXQ7XG4gICAgICAgIGMuX3N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG5cbiAgICAgICAgcmV0dXJuIG1ha2VNb21lbnQoYykudXRjKCk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0aW5nIHdpdGggdW5peCB0aW1lc3RhbXAgKGluIHNlY29uZHMpXG4gICAgbW9tZW50LnVuaXggPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudChpbnB1dCAqIDEwMDApO1xuICAgIH07XG5cbiAgICAvLyBkdXJhdGlvblxuICAgIG1vbWVudC5kdXJhdGlvbiA9IGZ1bmN0aW9uIChpbnB1dCwga2V5KSB7XG4gICAgICAgIHZhciBkdXJhdGlvbiA9IGlucHV0LFxuICAgICAgICAgICAgLy8gbWF0Y2hpbmcgYWdhaW5zdCByZWdleHAgaXMgZXhwZW5zaXZlLCBkbyBpdCBvbiBkZW1hbmRcbiAgICAgICAgICAgIG1hdGNoID0gbnVsbCxcbiAgICAgICAgICAgIHNpZ24sXG4gICAgICAgICAgICByZXQsXG4gICAgICAgICAgICBwYXJzZUlzbyxcbiAgICAgICAgICAgIGRpZmZSZXM7XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSkge1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgbXM6IGlucHV0Ll9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICAgICAgZDogaW5wdXQuX2RheXMsXG4gICAgICAgICAgICAgICAgTTogaW5wdXQuX21vbnRoc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uW2tleV0gPSBpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24ubWlsbGlzZWNvbmRzID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIGQ6IHRvSW50KG1hdGNoW0RBVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgaDogdG9JbnQobWF0Y2hbSE9VUl0pICogc2lnbixcbiAgICAgICAgICAgICAgICBtOiB0b0ludChtYXRjaFtNSU5VVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgczogdG9JbnQobWF0Y2hbU0VDT05EXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG1zOiB0b0ludChtYXRjaFtNSUxMSVNFQ09ORF0pICogc2lnblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICghIShtYXRjaCA9IGlzb0R1cmF0aW9uUmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgICAgICBzaWduID0gKG1hdGNoWzFdID09PSAnLScpID8gLTEgOiAxO1xuICAgICAgICAgICAgcGFyc2VJc28gPSBmdW5jdGlvbiAoaW5wKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UnZCBub3JtYWxseSB1c2Ugfn5pbnAgZm9yIHRoaXMsIGJ1dCB1bmZvcnR1bmF0ZWx5IGl0IGFsc29cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0cyBmbG9hdHMgdG8gaW50cy5cbiAgICAgICAgICAgICAgICAvLyBpbnAgbWF5IGJlIHVuZGVmaW5lZCwgc28gY2FyZWZ1bCBjYWxsaW5nIHJlcGxhY2Ugb24gaXQuXG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGlucCAmJiBwYXJzZUZsb2F0KGlucC5yZXBsYWNlKCcsJywgJy4nKSk7XG4gICAgICAgICAgICAgICAgLy8gYXBwbHkgc2lnbiB3aGlsZSB3ZSdyZSBhdCBpdFxuICAgICAgICAgICAgICAgIHJldHVybiAoaXNOYU4ocmVzKSA/IDAgOiByZXMpICogc2lnbjtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUlzbyhtYXRjaFsyXSksXG4gICAgICAgICAgICAgICAgTTogcGFyc2VJc28obWF0Y2hbM10pLFxuICAgICAgICAgICAgICAgIGQ6IHBhcnNlSXNvKG1hdGNoWzRdKSxcbiAgICAgICAgICAgICAgICBoOiBwYXJzZUlzbyhtYXRjaFs1XSksXG4gICAgICAgICAgICAgICAgbTogcGFyc2VJc28obWF0Y2hbNl0pLFxuICAgICAgICAgICAgICAgIHM6IHBhcnNlSXNvKG1hdGNoWzddKSxcbiAgICAgICAgICAgICAgICB3OiBwYXJzZUlzbyhtYXRjaFs4XSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGR1cmF0aW9uID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgICgnZnJvbScgaW4gZHVyYXRpb24gfHwgJ3RvJyBpbiBkdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGRpZmZSZXMgPSBtb21lbnRzRGlmZmVyZW5jZShtb21lbnQoZHVyYXRpb24uZnJvbSksIG1vbWVudChkdXJhdGlvbi50bykpO1xuXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgZHVyYXRpb24ubXMgPSBkaWZmUmVzLm1pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIGR1cmF0aW9uLk0gPSBkaWZmUmVzLm1vbnRocztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldCA9IG5ldyBEdXJhdGlvbihkdXJhdGlvbik7XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSAmJiBoYXNPd25Qcm9wKGlucHV0LCAnX2xvY2FsZScpKSB7XG4gICAgICAgICAgICByZXQuX2xvY2FsZSA9IGlucHV0Ll9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvLyB2ZXJzaW9uIG51bWJlclxuICAgIG1vbWVudC52ZXJzaW9uID0gVkVSU0lPTjtcblxuICAgIC8vIGRlZmF1bHQgZm9ybWF0XG4gICAgbW9tZW50LmRlZmF1bHRGb3JtYXQgPSBpc29Gb3JtYXQ7XG5cbiAgICAvLyBjb25zdGFudCB0aGF0IHJlZmVycyB0byB0aGUgSVNPIHN0YW5kYXJkXG4gICAgbW9tZW50LklTT184NjAxID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBQbHVnaW5zIHRoYXQgYWRkIHByb3BlcnRpZXMgc2hvdWxkIGFsc28gYWRkIHRoZSBrZXkgaGVyZSAobnVsbCB2YWx1ZSksXG4gICAgLy8gc28gd2UgY2FuIHByb3Blcmx5IGNsb25lIG91cnNlbHZlcy5cbiAgICBtb21lbnQubW9tZW50UHJvcGVydGllcyA9IG1vbWVudFByb3BlcnRpZXM7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW5ldmVyIGEgbW9tZW50IGlzIG11dGF0ZWQuXG4gICAgLy8gSXQgaXMgaW50ZW5kZWQgdG8ga2VlcCB0aGUgb2Zmc2V0IGluIHN5bmMgd2l0aCB0aGUgdGltZXpvbmUuXG4gICAgbW9tZW50LnVwZGF0ZU9mZnNldCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgeW91IHRvIHNldCBhIHRocmVzaG9sZCBmb3IgcmVsYXRpdmUgdGltZSBzdHJpbmdzXG4gICAgbW9tZW50LnJlbGF0aXZlVGltZVRocmVzaG9sZCA9IGZ1bmN0aW9uICh0aHJlc2hvbGQsIGxpbWl0KSB7XG4gICAgICAgIGlmIChyZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaW1pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpdmVUaW1lVGhyZXNob2xkc1t0aHJlc2hvbGRdO1xuICAgICAgICB9XG4gICAgICAgIHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9IGxpbWl0O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgbW9tZW50LmxhbmcgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQubGFuZyBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZSBpbnN0ZWFkLicsXG4gICAgICAgIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmxvY2FsZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgbG9hZCBsb2NhbGUgYW5kIHRoZW4gc2V0IHRoZSBnbG9iYWwgbG9jYWxlLiAgSWZcbiAgICAvLyBubyBhcmd1bWVudHMgYXJlIHBhc3NlZCBpbiwgaXQgd2lsbCBzaW1wbHkgcmV0dXJuIHRoZSBjdXJyZW50IGdsb2JhbFxuICAgIC8vIGxvY2FsZSBrZXkuXG4gICAgbW9tZW50LmxvY2FsZSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlcykge1xuICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZih2YWx1ZXMpICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBtb21lbnQuZGVmaW5lTG9jYWxlKGtleSwgdmFsdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBtb21lbnQubG9jYWxlRGF0YShrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIG1vbWVudC5kdXJhdGlvbi5fbG9jYWxlID0gbW9tZW50Ll9sb2NhbGUgPSBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vbWVudC5fbG9jYWxlLl9hYmJyO1xuICAgIH07XG5cbiAgICBtb21lbnQuZGVmaW5lTG9jYWxlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlcykge1xuICAgICAgICBpZiAodmFsdWVzICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWJiciA9IG5hbWU7XG4gICAgICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBsb2NhbGVzW25hbWVdID0gbmV3IExvY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYWxlc1tuYW1lXS5zZXQodmFsdWVzKTtcblxuICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdCBmb3Igbm93OiBhbHNvIHNldCB0aGUgbG9jYWxlXG4gICAgICAgICAgICBtb21lbnQubG9jYWxlKG5hbWUpO1xuXG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsZXNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBtb21lbnQubGFuZ0RhdGEgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQubGFuZ0RhdGEgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbWVudC5sb2NhbGVEYXRhIGluc3RlYWQuJyxcbiAgICAgICAgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gcmV0dXJucyBsb2NhbGUgZGF0YVxuICAgIG1vbWVudC5sb2NhbGVEYXRhID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgbG9jYWxlO1xuXG4gICAgICAgIGlmIChrZXkgJiYga2V5Ll9sb2NhbGUgJiYga2V5Ll9sb2NhbGUuX2FiYnIpIHtcbiAgICAgICAgICAgIGtleSA9IGtleS5fbG9jYWxlLl9hYmJyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNBcnJheShrZXkpKSB7XG4gICAgICAgICAgICAvL3Nob3J0LWNpcmN1aXQgZXZlcnl0aGluZyBlbHNlXG4gICAgICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKGtleSk7XG4gICAgICAgICAgICBpZiAobG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleSA9IFtrZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNob29zZUxvY2FsZShrZXkpO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIG1vbWVudCBvYmplY3RcbiAgICBtb21lbnQuaXNNb21lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBNb21lbnQgfHxcbiAgICAgICAgICAgIChvYmogIT0gbnVsbCAmJiBoYXNPd25Qcm9wKG9iaiwgJ19pc0FNb21lbnRPYmplY3QnKSk7XG4gICAgfTtcblxuICAgIC8vIGZvciB0eXBlY2hlY2tpbmcgRHVyYXRpb24gb2JqZWN0c1xuICAgIG1vbWVudC5pc0R1cmF0aW9uID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRHVyYXRpb247XG4gICAgfTtcblxuICAgIGZvciAoaSA9IGxpc3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIG1ha2VMaXN0KGxpc3RzW2ldKTtcbiAgICB9XG5cbiAgICBtb21lbnQubm9ybWFsaXplVW5pdHMgPSBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LmludmFsaWQgPSBmdW5jdGlvbiAoZmxhZ3MpIHtcbiAgICAgICAgdmFyIG0gPSBtb21lbnQudXRjKE5hTik7XG4gICAgICAgIGlmIChmbGFncyAhPSBudWxsKSB7XG4gICAgICAgICAgICBleHRlbmQobS5fcGYsIGZsYWdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG0uX3BmLnVzZXJJbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnBhcnNlWm9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpLnBhcnNlWm9uZSgpO1xuICAgIH07XG5cbiAgICBtb21lbnQucGFyc2VUd29EaWdpdFllYXIgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHRvSW50KGlucHV0KSArICh0b0ludChpbnB1dCkgPiA2OCA/IDE5MDAgOiAyMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBNb21lbnQgUHJvdG90eXBlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQobW9tZW50LmZuID0gTW9tZW50LnByb3RvdHlwZSwge1xuXG4gICAgICAgIGNsb25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLl9kICsgKCh0aGlzLl9vZmZzZXQgfHwgMCkgKiA2MDAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5peCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCt0aGlzIC8gMTAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZSgnZW4nKS5mb3JtYXQoJ2RkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9EYXRlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldCA/IG5ldyBEYXRlKCt0aGlzKSA6IHRoaXMuX2Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vbWVudCh0aGlzKS51dGMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgbS55ZWFyKCkgJiYgbS55ZWFyKCkgPD0gOTk5OSkge1xuICAgICAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIGlzIH41MHggZmFzdGVyLCB1c2UgaXQgd2hlbiB3ZSBjYW5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9EYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICB0b0FycmF5IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG0gPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBtLnllYXIoKSxcbiAgICAgICAgICAgICAgICBtLm1vbnRoKCksXG4gICAgICAgICAgICAgICAgbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgbS5ob3VycygpLFxuICAgICAgICAgICAgICAgIG0ubWludXRlcygpLFxuICAgICAgICAgICAgICAgIG0uc2Vjb25kcygpLFxuICAgICAgICAgICAgICAgIG0ubWlsbGlzZWNvbmRzKClcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNWYWxpZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzRFNUU2hpZnRlZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmIGNvbXBhcmVBcnJheXModGhpcy5fYSwgKHRoaXMuX2lzVVRDID8gbW9tZW50LnV0Yyh0aGlzLl9hKSA6IG1vbWVudCh0aGlzLl9hKSkudG9BcnJheSgpKSA+IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzaW5nRmxhZ3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZXh0ZW5kKHt9LCB0aGlzLl9wZik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW52YWxpZEF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGYub3ZlcmZsb3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXRjIDogZnVuY3Rpb24gKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmUoMCwga2VlcExvY2FsVGltZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9jYWwgOiBmdW5jdGlvbiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzVVRDKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKDAsIGtlZXBMb2NhbFRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZCh0aGlzLl9kYXRlVHpPZmZzZXQoKSwgJ20nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBmb3JtYXQgOiBmdW5jdGlvbiAoaW5wdXRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBmb3JtYXRNb21lbnQodGhpcywgaW5wdXRTdHJpbmcgfHwgbW9tZW50LmRlZmF1bHRGb3JtYXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBjcmVhdGVBZGRlcigxLCAnYWRkJyksXG5cbiAgICAgICAgc3VidHJhY3QgOiBjcmVhdGVBZGRlcigtMSwgJ3N1YnRyYWN0JyksXG5cbiAgICAgICAgZGlmZiA6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMsIGFzRmxvYXQpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gbWFrZUFzKGlucHV0LCB0aGlzKSxcbiAgICAgICAgICAgICAgICB6b25lRGlmZiA9ICh0aGlzLnpvbmUoKSAtIHRoYXQuem9uZSgpKSAqIDZlNCxcbiAgICAgICAgICAgICAgICBkaWZmLCBvdXRwdXQsIGRheXNBZGp1c3Q7XG5cbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd5ZWFyJyB8fCB1bml0cyA9PT0gJ21vbnRoJykge1xuICAgICAgICAgICAgICAgIC8vIGF2ZXJhZ2UgbnVtYmVyIG9mIGRheXMgaW4gdGhlIG1vbnRocyBpbiB0aGUgZ2l2ZW4gZGF0ZXNcbiAgICAgICAgICAgICAgICBkaWZmID0gKHRoaXMuZGF5c0luTW9udGgoKSArIHRoYXQuZGF5c0luTW9udGgoKSkgKiA0MzJlNTsgLy8gMjQgKiA2MCAqIDYwICogMTAwMCAvIDJcbiAgICAgICAgICAgICAgICAvLyBkaWZmZXJlbmNlIGluIG1vbnRoc1xuICAgICAgICAgICAgICAgIG91dHB1dCA9ICgodGhpcy55ZWFyKCkgLSB0aGF0LnllYXIoKSkgKiAxMikgKyAodGhpcy5tb250aCgpIC0gdGhhdC5tb250aCgpKTtcbiAgICAgICAgICAgICAgICAvLyBhZGp1c3QgYnkgdGFraW5nIGRpZmZlcmVuY2UgaW4gZGF5cywgYXZlcmFnZSBudW1iZXIgb2YgZGF5c1xuICAgICAgICAgICAgICAgIC8vIGFuZCBkc3QgaW4gdGhlIGdpdmVuIG1vbnRocy5cbiAgICAgICAgICAgICAgICBkYXlzQWRqdXN0ID0gKHRoaXMgLSBtb21lbnQodGhpcykuc3RhcnRPZignbW9udGgnKSkgLVxuICAgICAgICAgICAgICAgICAgICAodGhhdCAtIG1vbWVudCh0aGF0KS5zdGFydE9mKCdtb250aCcpKTtcbiAgICAgICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aXRoIHpvbmVzLCB0byBuZWdhdGUgYWxsIGRzdFxuICAgICAgICAgICAgICAgIGRheXNBZGp1c3QgLT0gKCh0aGlzLnpvbmUoKSAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCdtb250aCcpLnpvbmUoKSkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoYXQuem9uZSgpIC0gbW9tZW50KHRoYXQpLnN0YXJ0T2YoJ21vbnRoJykuem9uZSgpKSkgKiA2ZTQ7XG4gICAgICAgICAgICAgICAgb3V0cHV0ICs9IGRheXNBZGp1c3QgLyBkaWZmO1xuICAgICAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDEyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9ICh0aGlzIC0gdGhhdCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdW5pdHMgPT09ICdzZWNvbmQnID8gZGlmZiAvIDFlMyA6IC8vIDEwMDBcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICdtaW51dGUnID8gZGlmZiAvIDZlNCA6IC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2hvdXInID8gZGlmZiAvIDM2ZTUgOiAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2RheScgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDg2NGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCwgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ3dlZWsnID8gKGRpZmYgLSB6b25lRGlmZikgLyA2MDQ4ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0ICogNywgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICBkaWZmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFzRmxvYXQgPyBvdXRwdXQgOiBhYnNSb3VuZChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb20gOiBmdW5jdGlvbiAodGltZSwgd2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5kdXJhdGlvbih7dG86IHRoaXMsIGZyb206IHRpbWV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXdpdGhvdXRTdWZmaXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb21Ob3cgOiBmdW5jdGlvbiAod2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZnJvbShtb21lbnQoKSwgd2l0aG91dFN1ZmZpeCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAodGltZSkge1xuICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBjb21wYXJlIHRoZSBzdGFydCBvZiB0b2RheSwgdnMgdGhpcy5cbiAgICAgICAgICAgIC8vIEdldHRpbmcgc3RhcnQtb2YtdG9kYXkgZGVwZW5kcyBvbiB3aGV0aGVyIHdlJ3JlIHpvbmUnZCBvciBub3QuXG4gICAgICAgICAgICB2YXIgbm93ID0gdGltZSB8fCBtb21lbnQoKSxcbiAgICAgICAgICAgICAgICBzb2QgPSBtYWtlQXMobm93LCB0aGlzKS5zdGFydE9mKCdkYXknKSxcbiAgICAgICAgICAgICAgICBkaWZmID0gdGhpcy5kaWZmKHNvZCwgJ2RheXMnLCB0cnVlKSxcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSBkaWZmIDwgLTYgPyAnc2FtZUVsc2UnIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IC0xID8gJ2xhc3RXZWVrJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAwID8gJ2xhc3REYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDEgPyAnc2FtZURheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMiA/ICduZXh0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCA3ID8gJ25leHRXZWVrJyA6ICdzYW1lRWxzZSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQodGhpcy5sb2NhbGVEYXRhKCkuY2FsZW5kYXIoZm9ybWF0LCB0aGlzLCBtb21lbnQobm93KSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTGVhcFllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih0aGlzLnllYXIoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1QgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDApLnpvbmUoKSB8fFxuICAgICAgICAgICAgICAgIHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDUpLnpvbmUoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5ID0gdGhpcy5faXNVVEMgPyB0aGlzLl9kLmdldFVUQ0RheSgpIDogdGhpcy5fZC5nZXREYXkoKTtcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoaW5wdXQgLSBkYXksICdkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGggOiBtYWtlQWNjZXNzb3IoJ01vbnRoJywgdHJ1ZSksXG5cbiAgICAgICAgc3RhcnRPZiA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICAvLyB0aGUgZm9sbG93aW5nIHN3aXRjaCBpbnRlbnRpb25hbGx5IG9taXRzIGJyZWFrIGtleXdvcmRzXG4gICAgICAgICAgICAvLyB0byB1dGlsaXplIGZhbGxpbmcgdGhyb3VnaCB0aGUgY2FzZXMuXG4gICAgICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICBjYXNlICd5ZWFyJzpcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3F1YXJ0ZXInOlxuICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSgxKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICd3ZWVrJzpcbiAgICAgICAgICAgIGNhc2UgJ2lzb1dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgICAgICAgICB0aGlzLmhvdXJzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ2hvdXInOlxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdtaW51dGUnOlxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdzZWNvbmQnOlxuICAgICAgICAgICAgICAgIHRoaXMubWlsbGlzZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gd2Vla3MgYXJlIGEgc3BlY2lhbCBjYXNlXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd3ZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2RheSgwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodW5pdHMgPT09ICdpc29XZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNvV2Vla2RheSgxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcXVhcnRlcnMgYXJlIGFsc28gc3BlY2lhbFxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKE1hdGguZmxvb3IodGhpcy5tb250aCgpIC8gMykgKiAzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5kT2Y6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09IHVuZGVmaW5lZCB8fCB1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnRPZih1bml0cykuYWRkKDEsICh1bml0cyA9PT0gJ2lzb1dlZWsnID8gJ3dlZWsnIDogdW5pdHMpKS5zdWJ0cmFjdCgxLCAnbXMnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0FmdGVyOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzID4gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/ICtpbnB1dCA6ICttb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dE1zIDwgK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBpc0JlZm9yZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHR5cGVvZiB1bml0cyAhPT0gJ3VuZGVmaW5lZCcgPyB1bml0cyA6ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA8ICtpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXRNcyA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyAraW5wdXQgOiArbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5lbmRPZih1bml0cykgPCBpbnB1dE1zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzU2FtZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzIHx8ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA9PT0gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gK21vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsodGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpKSA8PSBpbnB1dE1zICYmIGlucHV0TXMgPD0gKyh0aGlzLmNsb25lKCkuZW5kT2YodW5pdHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtaW46IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgJ21vbWVudCgpLm1pbiBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICAgb3RoZXIgPSBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA8IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICksXG5cbiAgICAgICAgbWF4OiBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgJ21vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1heCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyID0gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA+IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIC8vIGtlZXBMb2NhbFRpbWUgPSB0cnVlIG1lYW5zIG9ubHkgY2hhbmdlIHRoZSB0aW1lem9uZSwgd2l0aG91dFxuICAgICAgICAvLyBhZmZlY3RpbmcgdGhlIGxvY2FsIGhvdXIuIFNvIDU6MzE6MjYgKzAzMDAgLS1bem9uZSgyLCB0cnVlKV0tLT5cbiAgICAgICAgLy8gNTozMToyNiArMDIwMCBJdCBpcyBwb3NzaWJsZSB0aGF0IDU6MzE6MjYgZG9lc24ndCBleGlzdCBpbnQgem9uZVxuICAgICAgICAvLyArMDIwMCwgc28gd2UgYWRqdXN0IHRoZSB0aW1lIGFzIG5lZWRlZCwgdG8gYmUgdmFsaWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEtlZXBpbmcgdGhlIHRpbWUgYWN0dWFsbHkgYWRkcy9zdWJ0cmFjdHMgKG9uZSBob3VyKVxuICAgICAgICAvLyBmcm9tIHRoZSBhY3R1YWwgcmVwcmVzZW50ZWQgdGltZS4gVGhhdCBpcyB3aHkgd2UgY2FsbCB1cGRhdGVPZmZzZXRcbiAgICAgICAgLy8gYSBzZWNvbmQgdGltZS4gSW4gY2FzZSBpdCB3YW50cyB1cyB0byBjaGFuZ2UgdGhlIG9mZnNldCBhZ2FpblxuICAgICAgICAvLyBfY2hhbmdlSW5Qcm9ncmVzcyA9PSB0cnVlIGNhc2UsIHRoZW4gd2UgaGF2ZSB0byBhZGp1c3QsIGJlY2F1c2VcbiAgICAgICAgLy8gdGhlcmUgaXMgbm8gc3VjaCB0aW1lIGluIHRoZSBnaXZlbiB0aW1lem9uZS5cbiAgICAgICAgem9uZSA6IGZ1bmN0aW9uIChpbnB1dCwga2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuX29mZnNldCB8fCAwLFxuICAgICAgICAgICAgICAgIGxvY2FsQWRqdXN0O1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoaW5wdXQpIDwgMTYpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSBpbnB1dCAqIDYwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2lzVVRDICYmIGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxBZGp1c3QgPSB0aGlzLl9kYXRlVHpPZmZzZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fb2Zmc2V0ID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faXNVVEMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbEFkanVzdCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3VidHJhY3QobG9jYWxBZGp1c3QsICdtJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgha2VlcExvY2FsVGltZSB8fCB0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC5kdXJhdGlvbihvZmZzZXQgLSBpbnB1dCwgJ20nKSwgMSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gb2Zmc2V0IDogdGhpcy5fZGF0ZVR6T2Zmc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lQWJiciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdVVEMnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgem9uZU5hbWUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyAnQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2Vab25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3R6bSkge1xuICAgICAgICAgICAgICAgIHRoaXMuem9uZSh0aGlzLl90em0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5faSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvbmUodGhpcy5faSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBoYXNBbGlnbmVkSG91ck9mZnNldCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgaWYgKCFpbnB1dCkge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbW9tZW50KGlucHV0KS56b25lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy56b25lKCkgLSBpbnB1dCkgJSA2MCA9PT0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXlzSW5Nb250aCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXlzSW5Nb250aCh0aGlzLnllYXIoKSwgdGhpcy5tb250aCgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXlPZlllYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciBkYXlPZlllYXIgPSByb3VuZCgobW9tZW50KHRoaXMpLnN0YXJ0T2YoJ2RheScpIC0gbW9tZW50KHRoaXMpLnN0YXJ0T2YoJ3llYXInKSkgLyA4NjRlNSkgKyAxO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyBkYXlPZlllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSBkYXlPZlllYXIpLCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHF1YXJ0ZXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gTWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkgKyAxKSAvIDMpIDogdGhpcy5tb250aCgoaW5wdXQgLSAxKSAqIDMgKyB0aGlzLm1vbnRoKCkgJSAzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdywgdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG95KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoKGlucHV0IC0geWVhciksICd5Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla1llYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoKGlucHV0IC0geWVhciksICd5Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWsgPSB0aGlzLmxvY2FsZURhdGEoKS53ZWVrKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoKGlucHV0IC0gd2VlaykgKiA3LCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWsgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS53ZWVrO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoKGlucHV0IC0gd2VlaykgKiA3LCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrZGF5ID0gKHRoaXMuZGF5KCkgKyA3IC0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93KSAlIDc7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWtkYXkgOiB0aGlzLmFkZChpbnB1dCAtIHdlZWtkYXksICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla2RheSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgLy8gYmVoYXZlcyB0aGUgc2FtZSBhcyBtb21lbnQjZGF5IGV4Y2VwdFxuICAgICAgICAgICAgLy8gYXMgYSBnZXR0ZXIsIHJldHVybnMgNyBpbnN0ZWFkIG9mIDAgKDEtNyByYW5nZSBpbnN0ZWFkIG9mIDAtNilcbiAgICAgICAgICAgIC8vIGFzIGEgc2V0dGVyLCBzdW5kYXkgc2hvdWxkIGJlbG9uZyB0byB0aGUgcHJldmlvdXMgd2Vlay5cbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gdGhpcy5kYXkoKSB8fCA3IDogdGhpcy5kYXkodGhpcy5kYXkoKSAlIDcgPyBpbnB1dCA6IGlucHV0IC0gNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla3NJblllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIDEsIDQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtzSW5ZZWFyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHdlZWtJbmZvID0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWs7XG4gICAgICAgICAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIHdlZWtJbmZvLmRvdywgd2Vla0luZm8uZG95KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHNdKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKHVuaXRzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbdW5pdHNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpc1t1bml0c10odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSWYgcGFzc2VkIGEgbG9jYWxlIGtleSwgaXQgd2lsbCBzZXQgdGhlIGxvY2FsZSBmb3IgdGhpc1xuICAgICAgICAvLyBpbnN0YW5jZS4gIE90aGVyd2lzZSwgaXQgd2lsbCByZXR1cm4gdGhlIGxvY2FsZSBjb25maWd1cmF0aW9uXG4gICAgICAgIC8vIHZhcmlhYmxlcyBmb3IgdGhpcyBpbnN0YW5jZS5cbiAgICAgICAgbG9jYWxlIDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIG5ld0xvY2FsZURhdGE7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGUuX2FiYnI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0xvY2FsZURhdGEgPSBtb21lbnQubG9jYWxlRGF0YShrZXkpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdMb2NhbGVEYXRhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYWxlID0gbmV3TG9jYWxlRGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbGFuZyA6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICdtb21lbnQoKS5sYW5nKCkgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIG1vbWVudCgpLmxvY2FsZURhdGEoKSB0byBnZXQgdGhlIGxhbmd1YWdlIGNvbmZpZ3VyYXRpb24uIFVzZSBtb21lbnQoKS5sb2NhbGUoKSB0byBjaGFuZ2UgbGFuZ3VhZ2VzLicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgbG9jYWxlRGF0YSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2RhdGVUek9mZnNldCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIE9uIEZpcmVmb3guMjQgRGF0ZSNnZXRUaW1lem9uZU9mZnNldCByZXR1cm5zIGEgZmxvYXRpbmcgcG9pbnQuXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9wdWxsLzE4NzFcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHRoaXMuX2QuZ2V0VGltZXpvbmVPZmZzZXQoKSAvIDE1KSAqIDE1O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByYXdNb250aFNldHRlcihtb20sIHZhbHVlKSB7XG4gICAgICAgIHZhciBkYXlPZk1vbnRoO1xuXG4gICAgICAgIC8vIFRPRE86IE1vdmUgdGhpcyBvdXQgb2YgaGVyZSFcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbW9tLmxvY2FsZURhdGEoKS5tb250aHNQYXJzZSh2YWx1ZSk7XG4gICAgICAgICAgICAvLyBUT0RPOiBBbm90aGVyIHNpbGVudCBmYWlsdXJlP1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZGF5T2ZNb250aCA9IE1hdGgubWluKG1vbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgZGF5c0luTW9udGgobW9tLnllYXIoKSwgdmFsdWUpKTtcbiAgICAgICAgbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArICdNb250aCddKHZhbHVlLCBkYXlPZk1vbnRoKTtcbiAgICAgICAgcmV0dXJuIG1vbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdHZXR0ZXIobW9tLCB1bml0KSB7XG4gICAgICAgIHJldHVybiBtb20uX2RbJ2dldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdTZXR0ZXIobW9tLCB1bml0LCB2YWx1ZSkge1xuICAgICAgICBpZiAodW5pdCA9PT0gJ01vbnRoJykge1xuICAgICAgICAgICAgcmV0dXJuIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG1vbS5fZFsnc2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlQWNjZXNzb3IodW5pdCwga2VlcFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICByYXdTZXR0ZXIodGhpcywgdW5pdCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywga2VlcFRpbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmF3R2V0dGVyKHRoaXMsIHVuaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG1vbWVudC5mbi5taWxsaXNlY29uZCA9IG1vbWVudC5mbi5taWxsaXNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ01pbGxpc2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4uc2Vjb25kID0gbW9tZW50LmZuLnNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ1NlY29uZHMnLCBmYWxzZSk7XG4gICAgbW9tZW50LmZuLm1pbnV0ZSA9IG1vbWVudC5mbi5taW51dGVzID0gbWFrZUFjY2Vzc29yKCdNaW51dGVzJywgZmFsc2UpO1xuICAgIC8vIFNldHRpbmcgdGhlIGhvdXIgc2hvdWxkIGtlZXAgdGhlIHRpbWUsIGJlY2F1c2UgdGhlIHVzZXIgZXhwbGljaXRseVxuICAgIC8vIHNwZWNpZmllZCB3aGljaCBob3VyIGhlIHdhbnRzLiBTbyB0cnlpbmcgdG8gbWFpbnRhaW4gdGhlIHNhbWUgaG91ciAoaW5cbiAgICAvLyBhIG5ldyB0aW1lem9uZSkgbWFrZXMgc2Vuc2UuIEFkZGluZy9zdWJ0cmFjdGluZyBob3VycyBkb2VzIG5vdCBmb2xsb3dcbiAgICAvLyB0aGlzIHJ1bGUuXG4gICAgbW9tZW50LmZuLmhvdXIgPSBtb21lbnQuZm4uaG91cnMgPSBtYWtlQWNjZXNzb3IoJ0hvdXJzJywgdHJ1ZSk7XG4gICAgLy8gbW9tZW50LmZuLm1vbnRoIGlzIGRlZmluZWQgc2VwYXJhdGVseVxuICAgIG1vbWVudC5mbi5kYXRlID0gbWFrZUFjY2Vzc29yKCdEYXRlJywgdHJ1ZSk7XG4gICAgbW9tZW50LmZuLmRhdGVzID0gZGVwcmVjYXRlKCdkYXRlcyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgZGF0ZSBpbnN0ZWFkLicsIG1ha2VBY2Nlc3NvcignRGF0ZScsIHRydWUpKTtcbiAgICBtb21lbnQuZm4ueWVhciA9IG1ha2VBY2Nlc3NvcignRnVsbFllYXInLCB0cnVlKTtcbiAgICBtb21lbnQuZm4ueWVhcnMgPSBkZXByZWNhdGUoJ3llYXJzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSB5ZWFyIGluc3RlYWQuJywgbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpKTtcblxuICAgIC8vIGFkZCBwbHVyYWwgbWV0aG9kc1xuICAgIG1vbWVudC5mbi5kYXlzID0gbW9tZW50LmZuLmRheTtcbiAgICBtb21lbnQuZm4ubW9udGhzID0gbW9tZW50LmZuLm1vbnRoO1xuICAgIG1vbWVudC5mbi53ZWVrcyA9IG1vbWVudC5mbi53ZWVrO1xuICAgIG1vbWVudC5mbi5pc29XZWVrcyA9IG1vbWVudC5mbi5pc29XZWVrO1xuICAgIG1vbWVudC5mbi5xdWFydGVycyA9IG1vbWVudC5mbi5xdWFydGVyO1xuXG4gICAgLy8gYWRkIGFsaWFzZWQgZm9ybWF0IG1ldGhvZHNcbiAgICBtb21lbnQuZm4udG9KU09OID0gbW9tZW50LmZuLnRvSVNPU3RyaW5nO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEdXJhdGlvbiBQcm90b3R5cGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGRheXNUb1llYXJzIChkYXlzKSB7XG4gICAgICAgIC8vIDQwMCB5ZWFycyBoYXZlIDE0NjA5NyBkYXlzICh0YWtpbmcgaW50byBhY2NvdW50IGxlYXAgeWVhciBydWxlcylcbiAgICAgICAgcmV0dXJuIGRheXMgKiA0MDAgLyAxNDYwOTc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24geWVhcnNUb0RheXMgKHllYXJzKSB7XG4gICAgICAgIC8vIHllYXJzICogMzY1ICsgYWJzUm91bmQoeWVhcnMgLyA0KSAtXG4gICAgICAgIC8vICAgICBhYnNSb3VuZCh5ZWFycyAvIDEwMCkgKyBhYnNSb3VuZCh5ZWFycyAvIDQwMCk7XG4gICAgICAgIHJldHVybiB5ZWFycyAqIDE0NjA5NyAvIDQwMDtcbiAgICB9XG5cbiAgICBleHRlbmQobW9tZW50LmR1cmF0aW9uLmZuID0gRHVyYXRpb24ucHJvdG90eXBlLCB7XG5cbiAgICAgICAgX2J1YmJsZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSB0aGlzLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICAgICAgZGF5cyA9IHRoaXMuX2RheXMsXG4gICAgICAgICAgICAgICAgbW9udGhzID0gdGhpcy5fbW9udGhzLFxuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLl9kYXRhLFxuICAgICAgICAgICAgICAgIHNlY29uZHMsIG1pbnV0ZXMsIGhvdXJzLCB5ZWFycyA9IDA7XG5cbiAgICAgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBidWJibGVzIHVwIHZhbHVlcywgc2VlIHRoZSB0ZXN0cyBmb3JcbiAgICAgICAgICAgIC8vIGV4YW1wbGVzIG9mIHdoYXQgdGhhdCBtZWFucy5cbiAgICAgICAgICAgIGRhdGEubWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzICUgMTAwMDtcblxuICAgICAgICAgICAgc2Vjb25kcyA9IGFic1JvdW5kKG1pbGxpc2Vjb25kcyAvIDEwMDApO1xuICAgICAgICAgICAgZGF0YS5zZWNvbmRzID0gc2Vjb25kcyAlIDYwO1xuXG4gICAgICAgICAgICBtaW51dGVzID0gYWJzUm91bmQoc2Vjb25kcyAvIDYwKTtcbiAgICAgICAgICAgIGRhdGEubWludXRlcyA9IG1pbnV0ZXMgJSA2MDtcblxuICAgICAgICAgICAgaG91cnMgPSBhYnNSb3VuZChtaW51dGVzIC8gNjApO1xuICAgICAgICAgICAgZGF0YS5ob3VycyA9IGhvdXJzICUgMjQ7XG5cbiAgICAgICAgICAgIGRheXMgKz0gYWJzUm91bmQoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgICAgIC8vIEFjY3VyYXRlbHkgY29udmVydCBkYXlzIHRvIHllYXJzLCBhc3N1bWUgc3RhcnQgZnJvbSB5ZWFyIDAuXG4gICAgICAgICAgICB5ZWFycyA9IGFic1JvdW5kKGRheXNUb1llYXJzKGRheXMpKTtcbiAgICAgICAgICAgIGRheXMgLT0gYWJzUm91bmQoeWVhcnNUb0RheXMoeWVhcnMpKTtcblxuICAgICAgICAgICAgLy8gMzAgZGF5cyB0byBhIG1vbnRoXG4gICAgICAgICAgICAvLyBUT0RPIChpc2tyZW4pOiBVc2UgYW5jaG9yIGRhdGUgKGxpa2UgMXN0IEphbikgdG8gY29tcHV0ZSB0aGlzLlxuICAgICAgICAgICAgbW9udGhzICs9IGFic1JvdW5kKGRheXMgLyAzMCk7XG4gICAgICAgICAgICBkYXlzICU9IDMwO1xuXG4gICAgICAgICAgICAvLyAxMiBtb250aHMgLT4gMSB5ZWFyXG4gICAgICAgICAgICB5ZWFycyArPSBhYnNSb3VuZChtb250aHMgLyAxMik7XG4gICAgICAgICAgICBtb250aHMgJT0gMTI7XG5cbiAgICAgICAgICAgIGRhdGEuZGF5cyA9IGRheXM7XG4gICAgICAgICAgICBkYXRhLm1vbnRocyA9IG1vbnRocztcbiAgICAgICAgICAgIGRhdGEueWVhcnMgPSB5ZWFycztcbiAgICAgICAgfSxcblxuICAgICAgICBhYnMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9taWxsaXNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyA9IE1hdGguYWJzKHRoaXMuX2RheXMpO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzID0gTWF0aC5hYnModGhpcy5fbW9udGhzKTtcblxuICAgICAgICAgICAgdGhpcy5fZGF0YS5taWxsaXNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1pbGxpc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLnNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLnNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5taW51dGVzID0gTWF0aC5hYnModGhpcy5fZGF0YS5taW51dGVzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEuaG91cnMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLmhvdXJzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEubW9udGhzID0gTWF0aC5hYnModGhpcy5fZGF0YS5tb250aHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS55ZWFycyA9IE1hdGguYWJzKHRoaXMuX2RhdGEueWVhcnMpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrcyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhYnNSb3VuZCh0aGlzLmRheXMoKSAvIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZhbHVlT2YgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWlsbGlzZWNvbmRzICtcbiAgICAgICAgICAgICAgdGhpcy5fZGF5cyAqIDg2NGU1ICtcbiAgICAgICAgICAgICAgKHRoaXMuX21vbnRocyAlIDEyKSAqIDI1OTJlNiArXG4gICAgICAgICAgICAgIHRvSW50KHRoaXMuX21vbnRocyAvIDEyKSAqIDMxNTM2ZTY7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaHVtYW5pemUgOiBmdW5jdGlvbiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHJlbGF0aXZlVGltZSh0aGlzLCAhd2l0aFN1ZmZpeCwgdGhpcy5sb2NhbGVEYXRhKCkpO1xuXG4gICAgICAgICAgICBpZiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHRoaXMubG9jYWxlRGF0YSgpLnBhc3RGdXR1cmUoK3RoaXMsIG91dHB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIG9ubHkgMi4wLXN0eWxlIGFkZCgxLCAncycpIG9yIGFkZChtb21lbnQpXG4gICAgICAgICAgICB2YXIgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlucHV0LCB2YWwpO1xuXG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgKz0gZHVyLl9taWxsaXNlY29uZHM7XG4gICAgICAgICAgICB0aGlzLl9kYXlzICs9IGR1ci5fZGF5cztcbiAgICAgICAgICAgIHRoaXMuX21vbnRocyArPSBkdXIuX21vbnRocztcblxuICAgICAgICAgICAgdGhpcy5fYnViYmxlKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnRyYWN0IDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIHZhciBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyAtPSBkdXIuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHRoaXMuX2RheXMgLT0gZHVyLl9kYXlzO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzIC09IGR1ci5fbW9udGhzO1xuXG4gICAgICAgICAgICB0aGlzLl9idWJibGUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW3VuaXRzLnRvTG93ZXJDYXNlKCkgKyAncyddKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXMgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHZhciBkYXlzLCBtb250aHM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcblxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbW9udGgnIHx8IHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDg2NGU1O1xuICAgICAgICAgICAgICAgIG1vbnRocyA9IHRoaXMuX21vbnRocyArIGRheXNUb1llYXJzKGRheXMpICogMTI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuaXRzID09PSAnbW9udGgnID8gbW9udGhzIDogbW9udGhzIC8gMTI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBtaWxsaXNlY29uZHMgc2VwYXJhdGVseSBiZWNhdXNlIG9mIGZsb2F0aW5nIHBvaW50IG1hdGggZXJyb3JzIChpc3N1ZSAjMTg2NylcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIE1hdGgucm91bmQoeWVhcnNUb0RheXModGhpcy5fbW9udGhzIC8gMTIpKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3dlZWsnOiByZXR1cm4gZGF5cyAvIDcgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA2MDQ4ZTU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RheSc6IHJldHVybiBkYXlzICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2hvdXInOiByZXR1cm4gZGF5cyAqIDI0ICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gMzZlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWludXRlJzogcmV0dXJuIGRheXMgKiAyNCAqIDYwICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gNmU0O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzZWNvbmQnOiByZXR1cm4gZGF5cyAqIDI0ICogNjAgKiA2MCArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDEwMDA7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hdGguZmxvb3IgcHJldmVudHMgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgaGVyZVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdtaWxsaXNlY29uZCc6IHJldHVybiBNYXRoLmZsb29yKGRheXMgKiAyNCAqIDYwICogNjAgKiAxMDAwKSArIHRoaXMuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHVuaXQgJyArIHVuaXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbGFuZyA6IG1vbWVudC5mbi5sYW5nLFxuICAgICAgICBsb2NhbGUgOiBtb21lbnQuZm4ubG9jYWxlLFxuXG4gICAgICAgIHRvSXNvU3RyaW5nIDogZGVwcmVjYXRlKFxuICAgICAgICAgICAgJ3RvSXNvU3RyaW5nKCkgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSB0b0lTT1N0cmluZygpIGluc3RlYWQgJyArXG4gICAgICAgICAgICAnKG5vdGljZSB0aGUgY2FwaXRhbHMpJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIHRvSVNPU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gaW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL2RvcmRpbGxlL21vbWVudC1pc29kdXJhdGlvbi9ibG9iL21hc3Rlci9tb21lbnQuaXNvZHVyYXRpb24uanNcbiAgICAgICAgICAgIHZhciB5ZWFycyA9IE1hdGguYWJzKHRoaXMueWVhcnMoKSksXG4gICAgICAgICAgICAgICAgbW9udGhzID0gTWF0aC5hYnModGhpcy5tb250aHMoKSksXG4gICAgICAgICAgICAgICAgZGF5cyA9IE1hdGguYWJzKHRoaXMuZGF5cygpKSxcbiAgICAgICAgICAgICAgICBob3VycyA9IE1hdGguYWJzKHRoaXMuaG91cnMoKSksXG4gICAgICAgICAgICAgICAgbWludXRlcyA9IE1hdGguYWJzKHRoaXMubWludXRlcygpKSxcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gTWF0aC5hYnModGhpcy5zZWNvbmRzKCkgKyB0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwMCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5hc1NlY29uZHMoKSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIHNhbWUgYXMgQyMncyAoTm9kYSkgYW5kIHB5dGhvbiAoaXNvZGF0ZSkuLi5cbiAgICAgICAgICAgICAgICAvLyBidXQgbm90IG90aGVyIEpTIChnb29nLmRhdGUpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdQMEQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuYXNTZWNvbmRzKCkgPCAwID8gJy0nIDogJycpICtcbiAgICAgICAgICAgICAgICAnUCcgK1xuICAgICAgICAgICAgICAgICh5ZWFycyA/IHllYXJzICsgJ1knIDogJycpICtcbiAgICAgICAgICAgICAgICAobW9udGhzID8gbW9udGhzICsgJ00nIDogJycpICtcbiAgICAgICAgICAgICAgICAoZGF5cyA/IGRheXMgKyAnRCcgOiAnJykgK1xuICAgICAgICAgICAgICAgICgoaG91cnMgfHwgbWludXRlcyB8fCBzZWNvbmRzKSA/ICdUJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKGhvdXJzID8gaG91cnMgKyAnSCcgOiAnJykgK1xuICAgICAgICAgICAgICAgIChtaW51dGVzID8gbWludXRlcyArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKHNlY29uZHMgPyBzZWNvbmRzICsgJ1MnIDogJycpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvY2FsZURhdGEgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4udG9TdHJpbmcgPSBtb21lbnQuZHVyYXRpb24uZm4udG9JU09TdHJpbmc7XG5cbiAgICBmdW5jdGlvbiBtYWtlRHVyYXRpb25HZXR0ZXIobmFtZSkge1xuICAgICAgICBtb21lbnQuZHVyYXRpb24uZm5bbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtuYW1lXTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmb3IgKGkgaW4gdW5pdE1pbGxpc2Vjb25kRmFjdG9ycykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcCh1bml0TWlsbGlzZWNvbmRGYWN0b3JzLCBpKSkge1xuICAgICAgICAgICAgbWFrZUR1cmF0aW9uR2V0dGVyKGkudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNaWxsaXNlY29uZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtcycpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzU2Vjb25kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3MnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01pbnV0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNIb3VycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ2gnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc0RheXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdkJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNXZWVrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3dlZWtzJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNb250aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdNJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNZZWFycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3knKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEZWZhdWx0IExvY2FsZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gU2V0IGRlZmF1bHQgbG9jYWxlLCBvdGhlciBsb2NhbGUgd2lsbCBpbmhlcml0IGZyb20gRW5nbGlzaC5cbiAgICBtb21lbnQubG9jYWxlKCdlbicsIHtcbiAgICAgICAgb3JkaW5hbFBhcnNlOiAvXFxkezEsMn0odGh8c3R8bmR8cmQpLyxcbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHZhciBiID0gbnVtYmVyICUgMTAsXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gKHRvSW50KG51bWJlciAlIDEwMCAvIDEwKSA9PT0gMSkgPyAndGgnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMSkgPyAnc3QnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMikgPyAnbmQnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMykgPyAncmQnIDogJ3RoJztcbiAgICAgICAgICAgIHJldHVybiBudW1iZXIgKyBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qIEVNQkVEX0xPQ0FMRVMgKi9cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRXhwb3NpbmcgTW9tZW50XG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZUdsb2JhbChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgLypnbG9iYWwgZW5kZXI6ZmFsc2UgKi9cbiAgICAgICAgaWYgKHR5cGVvZiBlbmRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvbGRHbG9iYWxNb21lbnQgPSBnbG9iYWxTY29wZS5tb21lbnQ7XG4gICAgICAgIGlmIChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzc2luZyBNb21lbnQgdGhyb3VnaCB0aGUgZ2xvYmFsIHNjb3BlIGlzICcgK1xuICAgICAgICAgICAgICAgICAgICAnZGVwcmVjYXRlZCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3JlbGVhc2UuJyxcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG1vbWVudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbW1vbkpTIG1vZHVsZSBpcyBkZWZpbmVkXG4gICAgaWYgKGhhc01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vbWVudDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoJ21vbWVudCcsIGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcbiAgICAgICAgICAgIGlmIChtb2R1bGUuY29uZmlnICYmIG1vZHVsZS5jb25maWcoKSAmJiBtb2R1bGUuY29uZmlnKCkubm9HbG9iYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyByZWxlYXNlIHRoZSBnbG9iYWwgdmFyaWFibGVcbiAgICAgICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBvbGRHbG9iYWxNb21lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQ7XG4gICAgICAgIH0pO1xuICAgICAgICBtYWtlR2xvYmFsKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1ha2VHbG9iYWwoKTtcbiAgICB9XG59KS5jYWxsKHRoaXMpO1xuIiwidmFyIGlvdGEgPSByZXF1aXJlKFwiaW90YS1hcnJheVwiKVxuXG52YXIgaGFzVHlwZWRBcnJheXMgID0gKCh0eXBlb2YgRmxvYXQ2NEFycmF5KSAhPT0gXCJ1bmRlZmluZWRcIilcbnZhciBoYXNCdWZmZXIgICAgICAgPSAoKHR5cGVvZiBCdWZmZXIpICE9PSBcInVuZGVmaW5lZFwiKVxuXG5mdW5jdGlvbiBjb21wYXJlMXN0KGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gLSBiWzBdXG59XG5cbmZ1bmN0aW9uIG9yZGVyKCkge1xuICB2YXIgc3RyaWRlID0gdGhpcy5zdHJpZGVcbiAgdmFyIHRlcm1zID0gbmV3IEFycmF5KHN0cmlkZS5sZW5ndGgpXG4gIHZhciBpXG4gIGZvcihpPTA7IGk8dGVybXMubGVuZ3RoOyArK2kpIHtcbiAgICB0ZXJtc1tpXSA9IFtNYXRoLmFicyhzdHJpZGVbaV0pLCBpXVxuICB9XG4gIHRlcm1zLnNvcnQoY29tcGFyZTFzdClcbiAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheSh0ZXJtcy5sZW5ndGgpXG4gIGZvcihpPTA7IGk8cmVzdWx0Lmxlbmd0aDsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gdGVybXNbaV1bMV1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVDb25zdHJ1Y3RvcihkdHlwZSwgZGltZW5zaW9uKSB7XG4gIHZhciBjbGFzc05hbWUgPSBbXCJWaWV3XCIsIGRpbWVuc2lvbiwgXCJkXCIsIGR0eXBlXS5qb2luKFwiXCIpXG4gIGlmKGRpbWVuc2lvbiA8IDApIHtcbiAgICBjbGFzc05hbWUgPSBcIlZpZXdfTmlsXCIgKyBkdHlwZVxuICB9XG4gIHZhciB1c2VHZXR0ZXJzID0gKGR0eXBlID09PSBcImdlbmVyaWNcIilcbiAgXG4gIGlmKGRpbWVuc2lvbiA9PT0gLTEpIHtcbiAgICAvL1NwZWNpYWwgY2FzZSBmb3IgdHJpdmlhbCBhcnJheXNcbiAgICB2YXIgY29kZSA9IFxuICAgICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSl7dGhpcy5kYXRhPWE7fTtcXFxudmFyIHByb3RvPVwiK2NsYXNzTmFtZStcIi5wcm90b3R5cGU7XFxcbnByb3RvLmR0eXBlPSdcIitkdHlwZStcIic7XFxcbnByb3RvLmluZGV4PWZ1bmN0aW9uKCl7cmV0dXJuIC0xfTtcXFxucHJvdG8uc2l6ZT0wO1xcXG5wcm90by5kaW1lbnNpb249LTE7XFxcbnByb3RvLnNoYXBlPXByb3RvLnN0cmlkZT1wcm90by5vcmRlcj1bXTtcXFxucHJvdG8ubG89cHJvdG8uaGk9cHJvdG8udHJhbnNwb3NlPXByb3RvLnN0ZXA9XFxcbmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhKTt9O1xcXG5wcm90by5nZXQ9cHJvdG8uc2V0PWZ1bmN0aW9uKCl7fTtcXFxucHJvdG8ucGljaz1mdW5jdGlvbigpe3JldHVybiBudWxsfTtcXFxucmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoYSl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIoYSk7fVwiXG4gICAgdmFyIHByb2NlZHVyZSA9IG5ldyBGdW5jdGlvbihjb2RlKVxuICAgIHJldHVybiBwcm9jZWR1cmUoKVxuICB9IGVsc2UgaWYoZGltZW5zaW9uID09PSAwKSB7XG4gICAgLy9TcGVjaWFsIGNhc2UgZm9yIDBkIGFycmF5c1xuICAgIHZhciBjb2RlID1cbiAgICAgIFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiKGEsZCkge1xcXG50aGlzLmRhdGEgPSBhO1xcXG50aGlzLm9mZnNldCA9IGRcXFxufTtcXFxudmFyIHByb3RvPVwiK2NsYXNzTmFtZStcIi5wcm90b3R5cGU7XFxcbnByb3RvLmR0eXBlPSdcIitkdHlwZStcIic7XFxcbnByb3RvLmluZGV4PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMub2Zmc2V0fTtcXFxucHJvdG8uZGltZW5zaW9uPTA7XFxcbnByb3RvLnNpemU9MTtcXFxucHJvdG8uc2hhcGU9XFxcbnByb3RvLnN0cmlkZT1cXFxucHJvdG8ub3JkZXI9W107XFxcbnByb3RvLmxvPVxcXG5wcm90by5oaT1cXFxucHJvdG8udHJhbnNwb3NlPVxcXG5wcm90by5zdGVwPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9jb3B5KCkge1xcXG5yZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsdGhpcy5vZmZzZXQpXFxcbn07XFxcbnByb3RvLnBpY2s9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3BpY2soKXtcXFxucmV0dXJuIFRyaXZpYWxBcnJheSh0aGlzLmRhdGEpO1xcXG59O1xcXG5wcm90by52YWx1ZU9mPXByb3RvLmdldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfZ2V0KCl7XFxcbnJldHVybiBcIisodXNlR2V0dGVycyA/IFwidGhpcy5kYXRhLmdldCh0aGlzLm9mZnNldClcIiA6IFwidGhpcy5kYXRhW3RoaXMub2Zmc2V0XVwiKStcblwifTtcXFxucHJvdG8uc2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zZXQodil7XFxcbnJldHVybiBcIisodXNlR2V0dGVycyA/IFwidGhpcy5kYXRhLnNldCh0aGlzLm9mZnNldCx2KVwiIDogXCJ0aGlzLmRhdGFbdGhpcy5vZmZzZXRdPXZcIikrXCJcXFxufTtcXFxucmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoYSxiLGMsZCl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIoYSxkKX1cIlxuICAgIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oXCJUcml2aWFsQXJyYXlcIiwgY29kZSlcbiAgICByZXR1cm4gcHJvY2VkdXJlKENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdWzBdKVxuICB9XG5cbiAgdmFyIGNvZGUgPSBbXCIndXNlIHN0cmljdCdcIl1cbiAgICBcbiAgLy9DcmVhdGUgY29uc3RydWN0b3IgZm9yIHZpZXdcbiAgdmFyIGluZGljZXMgPSBpb3RhKGRpbWVuc2lvbilcbiAgdmFyIGFyZ3MgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImlcIitpIH0pXG4gIHZhciBpbmRleF9zdHIgPSBcInRoaXMub2Zmc2V0K1wiICsgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICByZXR1cm4gXCJ0aGlzLnN0cmlkZVtcIiArIGkgKyBcIl0qaVwiICsgaVxuICAgICAgfSkuam9pbihcIitcIilcbiAgdmFyIHNoYXBlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICB2YXIgc3RyaWRlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiY1wiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICBjb2RlLnB1c2goXG4gICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSxcIiArIHNoYXBlQXJnICsgXCIsXCIgKyBzdHJpZGVBcmcgKyBcIixkKXt0aGlzLmRhdGE9YVwiLFxuICAgICAgXCJ0aGlzLnNoYXBlPVtcIiArIHNoYXBlQXJnICsgXCJdXCIsXG4gICAgICBcInRoaXMuc3RyaWRlPVtcIiArIHN0cmlkZUFyZyArIFwiXVwiLFxuICAgICAgXCJ0aGlzLm9mZnNldD1kfDB9XCIsXG4gICAgXCJ2YXIgcHJvdG89XCIrY2xhc3NOYW1lK1wiLnByb3RvdHlwZVwiLFxuICAgIFwicHJvdG8uZHR5cGU9J1wiK2R0eXBlK1wiJ1wiLFxuICAgIFwicHJvdG8uZGltZW5zaW9uPVwiK2RpbWVuc2lvbilcbiAgXG4gIC8vdmlldy5zaXplOlxuICBjb2RlLnB1c2goXCJPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sJ3NpemUnLHtnZXQ6ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3NpemUoKXtcXFxucmV0dXJuIFwiK2luZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwidGhpcy5zaGFwZVtcIitpK1wiXVwiIH0pLmpvaW4oXCIqXCIpLFxuXCJ9fSlcIilcblxuICAvL3ZpZXcub3JkZXI6XG4gIGlmKGRpbWVuc2lvbiA9PT0gMSkge1xuICAgIGNvZGUucHVzaChcInByb3RvLm9yZGVyPVswXVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcIk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywnb3JkZXInLHtnZXQ6XCIpXG4gICAgaWYoZGltZW5zaW9uIDwgNCkge1xuICAgICAgY29kZS5wdXNoKFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX29yZGVyKCl7XCIpXG4gICAgICBpZihkaW1lbnNpb24gPT09IDIpIHtcbiAgICAgICAgY29kZS5wdXNoKFwicmV0dXJuIChNYXRoLmFicyh0aGlzLnN0cmlkZVswXSk+TWF0aC5hYnModGhpcy5zdHJpZGVbMV0pKT9bMSwwXTpbMCwxXX19KVwiKVxuICAgICAgfSBlbHNlIGlmKGRpbWVuc2lvbiA9PT0gMykge1xuICAgICAgICBjb2RlLnB1c2goXG5cInZhciBzMD1NYXRoLmFicyh0aGlzLnN0cmlkZVswXSksczE9TWF0aC5hYnModGhpcy5zdHJpZGVbMV0pLHMyPU1hdGguYWJzKHRoaXMuc3RyaWRlWzJdKTtcXFxuaWYoczA+czEpe1xcXG5pZihzMT5zMil7XFxcbnJldHVybiBbMiwxLDBdO1xcXG59ZWxzZSBpZihzMD5zMil7XFxcbnJldHVybiBbMSwyLDBdO1xcXG59ZWxzZXtcXFxucmV0dXJuIFsxLDAsMl07XFxcbn1cXFxufWVsc2UgaWYoczA+czIpe1xcXG5yZXR1cm4gWzIsMCwxXTtcXFxufWVsc2UgaWYoczI+czEpe1xcXG5yZXR1cm4gWzAsMSwyXTtcXFxufWVsc2V7XFxcbnJldHVybiBbMCwyLDFdO1xcXG59fX0pXCIpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvZGUucHVzaChcIk9SREVSfSlcIilcbiAgICB9XG4gIH1cbiAgXG4gIC8vdmlldy5zZXQoaTAsIC4uLiwgdik6XG4gIGNvZGUucHVzaChcblwicHJvdG8uc2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zZXQoXCIrYXJncy5qb2luKFwiLFwiKStcIix2KXtcIilcbiAgaWYodXNlR2V0dGVycykge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGEuc2V0KFwiK2luZGV4X3N0citcIix2KX1cIilcbiAgfSBlbHNlIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhW1wiK2luZGV4X3N0citcIl09dn1cIilcbiAgfVxuICBcbiAgLy92aWV3LmdldChpMCwgLi4uKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uZ2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9nZXQoXCIrYXJncy5qb2luKFwiLFwiKStcIil7XCIpXG4gIGlmKHVzZUdldHRlcnMpIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhLmdldChcIitpbmRleF9zdHIrXCIpfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGFbXCIraW5kZXhfc3RyK1wiXX1cIilcbiAgfVxuICBcbiAgLy92aWV3LmluZGV4OlxuICBjb2RlLnB1c2goXG4gICAgXCJwcm90by5pbmRleD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfaW5kZXgoXCIsIGFyZ3Muam9pbigpLCBcIil7cmV0dXJuIFwiK2luZGV4X3N0citcIn1cIilcblxuICAvL3ZpZXcuaGkoKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uaGk9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2hpKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gW1wiKHR5cGVvZiBpXCIsaSxcIiE9PSdudW1iZXInfHxpXCIsaSxcIjwwKT90aGlzLnNoYXBlW1wiLCBpLCBcIl06aVwiLCBpLFwifDBcIl0uam9pbihcIlwiKVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInRoaXMuc3RyaWRlW1wiK2kgKyBcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLHRoaXMub2Zmc2V0KX1cIilcbiAgXG4gIC8vdmlldy5sbygpOlxuICB2YXIgYV92YXJzID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJhXCIraStcIj10aGlzLnNoYXBlW1wiK2krXCJdXCIgfSlcbiAgdmFyIGNfdmFycyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwiY1wiK2krXCI9dGhpcy5zdHJpZGVbXCIraStcIl1cIiB9KVxuICBjb2RlLnB1c2goXCJwcm90by5sbz1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfbG8oXCIrYXJncy5qb2luKFwiLFwiKStcIil7dmFyIGI9dGhpcy5vZmZzZXQsZD0wLFwiK2FfdmFycy5qb2luKFwiLFwiKStcIixcIitjX3ZhcnMuam9pbihcIixcIikpXG4gIGZvcih2YXIgaT0wOyBpPGRpbWVuc2lvbjsgKytpKSB7XG4gICAgY29kZS5wdXNoKFxuXCJpZih0eXBlb2YgaVwiK2krXCI9PT0nbnVtYmVyJyYmaVwiK2krXCI+PTApe1xcXG5kPWlcIitpK1wifDA7XFxcbmIrPWNcIitpK1wiKmQ7XFxcbmFcIitpK1wiLT1kfVwiKVxuICB9XG4gIGNvZGUucHVzaChcInJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIraVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImNcIitpXG4gICAgfSkuam9pbihcIixcIikrXCIsYil9XCIpXG4gIFxuICAvL3ZpZXcuc3RlcCgpOlxuICBjb2RlLnB1c2goXCJwcm90by5zdGVwPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zdGVwKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3ZhciBcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIraStcIj10aGlzLnNoYXBlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJiXCIraStcIj10aGlzLnN0cmlkZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsYz10aGlzLm9mZnNldCxkPTAsY2VpbD1NYXRoLmNlaWxcIilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXG5cImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInKXtcXFxuZD1pXCIraStcInwwO1xcXG5pZihkPDApe1xcXG5jKz1iXCIraStcIiooYVwiK2krXCItMSk7XFxcbmFcIitpK1wiPWNlaWwoLWFcIitpK1wiL2QpXFxcbn1lbHNle1xcXG5hXCIraStcIj1jZWlsKGFcIitpK1wiL2QpXFxcbn1cXFxuYlwiK2krXCIqPWRcXFxufVwiKVxuICB9XG4gIGNvZGUucHVzaChcInJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIgKyBpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiICsgaVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLGMpfVwiKVxuICBcbiAgLy92aWV3LnRyYW5zcG9zZSgpOlxuICB2YXIgdFNoYXBlID0gbmV3IEFycmF5KGRpbWVuc2lvbilcbiAgdmFyIHRTdHJpZGUgPSBuZXcgQXJyYXkoZGltZW5zaW9uKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIHRTaGFwZVtpXSA9IFwiYVtpXCIraStcIl1cIlxuICAgIHRTdHJpZGVbaV0gPSBcImJbaVwiK2krXCJdXCJcbiAgfVxuICBjb2RlLnB1c2goXCJwcm90by50cmFuc3Bvc2U9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3RyYW5zcG9zZShcIithcmdzK1wiKXtcIitcbiAgICBhcmdzLm1hcChmdW5jdGlvbihuLGlkeCkgeyByZXR1cm4gbiArIFwiPShcIiArIG4gKyBcIj09PXVuZGVmaW5lZD9cIiArIGlkeCArIFwiOlwiICsgbiArIFwifDApXCJ9KS5qb2luKFwiO1wiKSxcbiAgICBcInZhciBhPXRoaXMuc2hhcGUsYj10aGlzLnN0cmlkZTtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrdFNoYXBlLmpvaW4oXCIsXCIpK1wiLFwiK3RTdHJpZGUuam9pbihcIixcIikrXCIsdGhpcy5vZmZzZXQpfVwiKVxuICBcbiAgLy92aWV3LnBpY2soKTpcbiAgY29kZS5wdXNoKFwicHJvdG8ucGljaz1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfcGljayhcIithcmdzK1wiKXt2YXIgYT1bXSxiPVtdLGM9dGhpcy5vZmZzZXRcIilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXCJpZih0eXBlb2YgaVwiK2krXCI9PT0nbnVtYmVyJyYmaVwiK2krXCI+PTApe2M9KGMrdGhpcy5zdHJpZGVbXCIraStcIl0qaVwiK2krXCIpfDB9ZWxzZXthLnB1c2godGhpcy5zaGFwZVtcIitpK1wiXSk7Yi5wdXNoKHRoaXMuc3RyaWRlW1wiK2krXCJdKX1cIilcbiAgfVxuICBjb2RlLnB1c2goXCJ2YXIgY3Rvcj1DVE9SX0xJU1RbYS5sZW5ndGgrMV07cmV0dXJuIGN0b3IodGhpcy5kYXRhLGEsYixjKX1cIilcbiAgICBcbiAgLy9BZGQgcmV0dXJuIHN0YXRlbWVudFxuICBjb2RlLnB1c2goXCJyZXR1cm4gZnVuY3Rpb24gY29uc3RydWN0X1wiK2NsYXNzTmFtZStcIihkYXRhLHNoYXBlLHN0cmlkZSxvZmZzZXQpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwic2hhcGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInN0cmlkZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsb2Zmc2V0KX1cIilcblxuICAvL0NvbXBpbGUgcHJvY2VkdXJlXG4gIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oXCJDVE9SX0xJU1RcIiwgXCJPUkRFUlwiLCBjb2RlLmpvaW4oXCJcXG5cIikpXG4gIHJldHVybiBwcm9jZWR1cmUoQ0FDSEVEX0NPTlNUUlVDVE9SU1tkdHlwZV0sIG9yZGVyKVxufVxuXG5mdW5jdGlvbiBhcnJheURUeXBlKGRhdGEpIHtcbiAgaWYoaGFzQnVmZmVyKSB7XG4gICAgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG4gICAgICByZXR1cm4gXCJidWZmZXJcIlxuICAgIH1cbiAgfVxuICBpZihoYXNUeXBlZEFycmF5cykge1xuICAgIHN3aXRjaChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkpIHtcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEZsb2F0NjRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiZmxvYXQ2NFwiXG4gICAgICBjYXNlIFwiW29iamVjdCBGbG9hdDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImZsb2F0MzJcIlxuICAgICAgY2FzZSBcIltvYmplY3QgSW50OEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDE2QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDE2XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDMyXCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQ4QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQxNkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50MTZcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQzMlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50OENsYW1wZWRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDhfY2xhbXBlZFwiXG4gICAgfVxuICB9XG4gIGlmKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICByZXR1cm4gXCJhcnJheVwiXG4gIH1cbiAgcmV0dXJuIFwiZ2VuZXJpY1wiXG59XG5cbnZhciBDQUNIRURfQ09OU1RSVUNUT1JTID0ge1xuICBcImZsb2F0MzJcIjpbXSxcbiAgXCJmbG9hdDY0XCI6W10sXG4gIFwiaW50OFwiOltdLFxuICBcImludDE2XCI6W10sXG4gIFwiaW50MzJcIjpbXSxcbiAgXCJ1aW50OFwiOltdLFxuICBcInVpbnQxNlwiOltdLFxuICBcInVpbnQzMlwiOltdLFxuICBcImFycmF5XCI6W10sXG4gIFwidWludDhfY2xhbXBlZFwiOltdLFxuICBcImJ1ZmZlclwiOltdLFxuICBcImdlbmVyaWNcIjpbXVxufVxuXG47KGZ1bmN0aW9uKCkge1xuICBmb3IodmFyIGlkIGluIENBQ0hFRF9DT05TVFJVQ1RPUlMpIHtcbiAgICBDQUNIRURfQ09OU1RSVUNUT1JTW2lkXS5wdXNoKGNvbXBpbGVDb25zdHJ1Y3RvcihpZCwgLTEpKVxuICB9XG59KTtcblxuZnVuY3Rpb24gd3JhcHBlZE5EQXJyYXlDdG9yKGRhdGEsIHNoYXBlLCBzdHJpZGUsIG9mZnNldCkge1xuICBpZihkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgY3RvciA9IENBQ0hFRF9DT05TVFJVQ1RPUlMuYXJyYXlbMF1cbiAgICByZXR1cm4gY3RvcihbXSlcbiAgfSBlbHNlIGlmKHR5cGVvZiBkYXRhID09PSBcIm51bWJlclwiKSB7XG4gICAgZGF0YSA9IFtkYXRhXVxuICB9XG4gIGlmKHNoYXBlID09PSB1bmRlZmluZWQpIHtcbiAgICBzaGFwZSA9IFsgZGF0YS5sZW5ndGggXVxuICB9XG4gIHZhciBkID0gc2hhcGUubGVuZ3RoXG4gIGlmKHN0cmlkZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RyaWRlID0gbmV3IEFycmF5KGQpXG4gICAgZm9yKHZhciBpPWQtMSwgc3o9MTsgaT49MDsgLS1pKSB7XG4gICAgICBzdHJpZGVbaV0gPSBzelxuICAgICAgc3ogKj0gc2hhcGVbaV1cbiAgICB9XG4gIH1cbiAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBvZmZzZXQgPSAwXG4gICAgZm9yKHZhciBpPTA7IGk8ZDsgKytpKSB7XG4gICAgICBpZihzdHJpZGVbaV0gPCAwKSB7XG4gICAgICAgIG9mZnNldCAtPSAoc2hhcGVbaV0tMSkqc3RyaWRlW2ldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHZhciBkdHlwZSA9IGFycmF5RFR5cGUoZGF0YSlcbiAgdmFyIGN0b3JfbGlzdCA9IENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdXG4gIHdoaWxlKGN0b3JfbGlzdC5sZW5ndGggPD0gZCsxKSB7XG4gICAgY3Rvcl9saXN0LnB1c2goY29tcGlsZUNvbnN0cnVjdG9yKGR0eXBlLCBjdG9yX2xpc3QubGVuZ3RoLTEpKVxuICB9XG4gIHZhciBjdG9yID0gY3Rvcl9saXN0W2QrMV1cbiAgcmV0dXJuIGN0b3IoZGF0YSwgc2hhcGUsIHN0cmlkZSwgb2Zmc2V0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBwZWROREFycmF5Q3RvciIsIlwidXNlIHN0cmljdFwiXG5cbmZ1bmN0aW9uIGlvdGEobikge1xuICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG4pXG4gIGZvcih2YXIgaT0wOyBpPG47ICsraSkge1xuICAgIHJlc3VsdFtpXSA9IGlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW90YSIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cbiIsIi8vIGNoYXQvY29yZS5qc1xyXG4vLyBUaGUgY29yZSBvZiB0aGUgY2hhdCBzaW11bGF0aW9uIGJlaGF2aW9yXHJcblxyXG4vLyB2YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxudmFyIGRvbmdlciA9IHJlcXVpcmUoXCIuL2Rvbmdlci5qc1wiKTtcclxuXHJcbmZ1bmN0aW9uIGN1cnJUaW1lKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH1cclxuXHJcbi8qKlxyXG4gKiBcclxuICovXHJcbmZ1bmN0aW9uIENoYXQoKSB7XHJcblx0dGhpcy5faW5pdFVzZXJsaXN0KCk7XHJcblx0dGhpcy5faW5pdENoYXRTcGF3bkxvb3AoKTtcclxuXHRcclxuXHR0aGlzLl9pbml0VmlzaXRvckV2ZW50cygpO1xyXG59XHJcbi8vIGluaGVyaXRzKENoYXQsICk7XHJcbmV4dGVuZChDaGF0LnByb3RvdHlwZSwge1xyXG5cdFxyXG5cdF91X2xpc3QgOiBbXSwgLy9jb250YWlucyB0aGUgbGlzdCBvZiBhbGwgdXNlcnNcclxuXHRfdV9oYXNoIDoge30sIC8vY29udGFpbnMgYSBoYXNoIG9mIHVzZXJuYW1lcyB0byB1c2Vyc1xyXG5cdF91X2NsYXNzZXM6IHtcclxuXHRcdGNoYXRsZWFkZXI6IFtdLFxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRfaW5pdFVzZXJsaXN0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgdWwgPSByZXF1aXJlKFwiLi91c2VybGlzdFwiKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdWwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHUgPSBuZXcgVXNlcih1bFtpXSk7XHJcblx0XHRcdHRoaXMuX3VfbGlzdC5wdXNoKHUpO1xyXG5cdFx0XHR0aGlzLl91X2hhc2hbdS5uYW1lXSA9IHU7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIXRoaXMucGxheWVyVXNlcikge1xyXG5cdFx0XHRcdC8vVGhlIGZpcnN0IHVzZXIgaXMgdGhlIHBsYXllcidzIHVzZXJcclxuXHRcdFx0XHR0aGlzLnBsYXllclVzZXIgPSB1OyBcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X3JhbmRvbVVzZXIgOiBmdW5jdGlvbih0aW1lKXtcclxuXHRcdHRpbWUgPSB0aW1lIHx8IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0dmFyIGluZGV4O1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyMDsgaSsrKSB7IC8vdHJ5IHVwIHRvIG9ubHkgMjAgdGltZXNcclxuXHRcdFx0aW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLl91X2xpc3QubGVuZ3RoKTtcclxuXHRcdFx0dmFyIHUgPSB0aGlzLl91X2xpc3RbaW5kZXhdO1xyXG5cdFx0XHRpZiAodS5uZXh0VGltZVRhbGsgPiB0aW1lKSByZXR1cm4gdTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9JZiB3ZSBjYW4ndCBmaW5kIGEgdXNlciB0byByZXR1cm4sIG1ha2UgYSBuZXcgb25lIGFzIGEgZmFsbGJhY2tcclxuXHRcdHZhciB1ID0gbmV3IFVzZXIoe25hbWU6IFwiZ3Vlc3RcIisgKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAwKSArIDEwMDAwKSB9KTtcclxuXHRcdHRoaXMuX3VfbGlzdC5wdXNoKHUpO1xyXG5cdFx0dGhpcy5fdV9oYXNoW3UubmFtZV0gPSB1O1xyXG5cdFx0cmV0dXJuIHU7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfY3VyckNoYXRNb2RlIDogbnVsbCxcclxuXHRfaW5pdENoYXRTcGF3bkxvb3AgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0c2VsZi5fY3VyckNoYXRNb2RlID0gXCJsb2FkaW5nXCI7XHJcblx0XHRzZXRUaW1lb3V0KGNoYXRUaWNrLCAzMDAwKTtcclxuXHRcdFxyXG5cdFx0c2VsZi5zZXRDaGF0TW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcclxuXHRcdFx0c2VsZi5fY3VyckNoYXRNb2RlID0gbW9kZTtcclxuXHRcdFx0c2V0VGltZW91dChjaGF0VGljaywgMCk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBjaGF0VGljaygpIHtcclxuXHRcdFx0dmFyIG5leHRVcGRhdGUgPSBzZWxmLnVwZGF0ZUNoYXQoKTtcclxuXHRcdFx0aWYgKG5leHRVcGRhdGUgPCAwKSByZXR1cm47XHJcblx0XHRcdHNldFRpbWVvdXQoY2hhdFRpY2ssIG5leHRVcGRhdGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c2V0Q2hhdE1vZGUgOiBmdW5jdGlvbigpe30sXHJcblx0XHJcblx0dXBkYXRlQ2hhdCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0c3dpdGNoICh0aGlzLl9jdXJyQ2hhdE1vZGUpIHtcclxuXHRcdFx0Y2FzZSBcIm5vcm1hbFwiOlxyXG5cdFx0XHRcdHRoaXMuc3Bhd25DaGF0TWVzc2FnZSgpO1xyXG5cdFx0XHRcdHJldHVybiAzMDAgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNDAwKTtcclxuXHRcdFx0Y2FzZSBcImxvYWRpbmdcIjpcclxuXHRcdFx0XHQvL1RPRE9cclxuXHRcdFx0XHRyZXR1cm4gLTE7XHJcblx0XHRcdGNhc2UgXCJkaXNjb25uZWN0ZWRcIjpcclxuXHRcdFx0XHQvL1RPRE9cclxuXHRcdFx0XHRyZXR1cm4gMTAwMDtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdF9jdHhfcG9vbCA6IFtdLCAvLyBDb250ZXh0cyB0aGF0IGFyZSBhY3RpdmUgb3IgaGF2ZSBub3QgeWV0IHRpbWVkIG91dFxyXG5cdC8vIExvbmcgdGVybSBjb250ZXh0czpcclxuXHRfY3R4X2xvY2F0aW9uIDogbnVsbCwgLy8gVGhlIGNvbnRleHQgZm9yIHRoZSBjdXJyZW50IGxvY2F0aW9uXHJcblx0X2N0eF9vY2Nhc2lvbiA6IG51bGwsIC8vIFRoZSBjb250ZXh0IGZvciB0aGUgY3VycmVudCBvY2Nhc2lvblxyXG5cdFxyXG5cdC8qKiBBZGRzIGEgQ2hhdCBDb250ZXh0IHRvIHRoZSBjb250ZXh0IHBvb2wuICovXHJcblx0YWRkQ29udGV4dCA6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0Y3R4LnRpbWVzdGFtcCA9IGN1cnJUaW1lKCk7XHJcblx0XHR0aGlzLl9jdHhfcG9vbC5wdXNoKGN0eCk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdHNldExvY2F0aW9uQ29udGV4dCA6IGZ1bmN0aW9uKGNvbnRleHQpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqICovXHJcblx0X3RpY2tfbWFuYWdlQ29udGV4dHMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBkYXRlID0gY3VyclRpbWUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gUHJ1bmUgdGltZWQtb3V0IGNvbnRleHRzXHJcblx0XHR2YXIgcG9vbCA9IHRoaXMuX2N0eF9wb29sO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb29sLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChwb29sW2ldLmlzVGltZWRvdXQoZGF0ZSkpIHtcclxuXHRcdFx0XHRwb29sLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRpLS07XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdHBsYXllclVzZXI6IG51bGwsXHJcblx0XHJcblx0X2luaXRWaXNpdG9yRXZlbnRzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQkKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFxyXG5cdFx0XHQkKFwiI2NoYXRib3hcIikub24oXCJrZXlwcmVzc1wiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSAxMyAmJiAhZS5zaGlmdEtleSAmJiAhZS5jdHJsS2V5KSB7IC8vIEVudGVyXHJcblx0XHRcdFx0XHR2YXIgbXNnID0gJChcIiNjaGF0Ym94XCIpLnZhbCgpO1xyXG5cdFx0XHRcdFx0JChcIiNjaGF0Ym94XCIpLnZhbChcIlwiKTtcclxuXHRcdFx0XHRcdGlmIChtc2cuaW5kZXhPZihcIi9cIikgIT0gMCkge1xyXG5cdFx0XHRcdFx0XHRzZWxmLnB1dE1lc3NhZ2Uoc2VsZi5wbGF5ZXJVc2VyLCBtc2cpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly9Qcm9jZXNzIGNoYXQgbWVzc2FnZVxyXG5cdFx0XHRcdFx0c2VsZi5fcHJvY2Vzc1BsYXllckNoYXRNZXNzYWdlKG1zZyk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdF9wcm9jZXNzUGxheWVyQ2hhdE1lc3NhZ2UgOiBmdW5jdGlvbihtc2cpIHtcclxuXHRcdHZhciByZXM7XHJcblx0XHRpZiAocmVzID0gL14odXB8ZG93bnxsZWZ0fHJpZ2h0fHN0YXJ0fHNlbGVjdHxifGEpL2kuZXhlYyhtc2cpKSB7XHJcblx0XHRcdGNvbnRyb2xsZXIuc3VibWl0Q2hhdEtleXByZXNzKHJlc1sxXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0LyoqIFxyXG5cdCAqIFB1dHMgYSBtZXNzYWdlIGludG8gdGhlIGNoYXQuXHJcblx0ICovXHJcblx0cHV0TWVzc2FnZSA6IGZ1bmN0aW9uKHVzZXIsIHRleHQpIHtcclxuXHRcdGlmICh0eXBlb2YgdXNlciA9PSBcInN0cmluZ1wiKVxyXG5cdFx0XHR1c2VyID0gdGhpcy5fdV9oYXNoW3VzZXJdO1xyXG5cdFx0XHJcblx0XHR2YXIgbGluZSA9ICQoXCI8bGk+XCIpLmFkZENsYXNzKFwiY2hhdC1saW5lXCIpO1xyXG5cdFx0dmFyIGJhZGdlcyA9ICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJiYWRnZXNcIik7XHJcblx0XHR2YXIgZnJvbSA9ICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJmcm9tXCIpO1xyXG5cdFx0dmFyIGNvbG9uID0gbnVsbDtcclxuXHRcdHZhciBtc2cgPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwibWVzc2FnZVwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gU3R5bGUgdGhlIG1lc3NhZ2VcclxuXHRcdGlmICh1c2VyLmJhZGdlcykgYmFkZ2VzLmFwcGVuZCh1c2VyLmJhZGdlcyk7XHJcblx0XHRmcm9tLmh0bWwodXNlci5uYW1lKTtcclxuXHRcdGZyb20uY3NzKHsgXCJjb2xvclwiOiB1c2VyLmNvbG9yIH0pO1xyXG5cdFx0XHJcblx0XHQvL1Byb2Nlc3MgbWVzc2FnZVxyXG5cdFx0Ly9UT0RPIHJlcGxhY2UgZG9uZ2VyIHBsYWNlaG9sZGVycyBoZXJlXHJcblx0XHR0ZXh0ID0gZG9uZ2VyLmRvbmdlcmZ5KHRleHQpO1xyXG5cdFx0XHJcblx0XHQvLyBFc2NhcGUgSFRNTFxyXG5cdFx0dGV4dCA9IG1zZy50ZXh0KHRleHQpLmh0bWwoKTtcclxuXHRcdFxyXG5cdFx0Ly8gUmVwbGFjZSBUd2l0Y2ggZW1vdGVzXHJcblx0XHR0ZXh0ID0gZG9uZ2VyLnR3aXRjaGlmeSh0ZXh0KTtcclxuXHRcdFxyXG5cdFx0bXNnLmh0bWwodGV4dCk7XHJcblx0XHRcclxuXHRcdGlmICghdGV4dC5zdGFydHNXaXRoKFwiL21lIFwiKSkge1xyXG5cdFx0XHRjb2xvbiA9ICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJjb2xvblwiKS5odG1sKFwiOlwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1zZy5jc3MoeyBcImNvbG9yXCI6IHVzZXIuY29sb3IgfSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGxpbmUuYXBwZW5kKGJhZGdlcywgZnJvbSwgY29sb24sIG1zZyk7XHJcblx0XHRcclxuXHRcdCQoXCIjY2hhdC1saW5lc1wiKS5hcHBlbmQobGluZSk7XHJcblx0fSxcclxuXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDaGF0KCk7XHJcblxyXG5cclxuZnVuY3Rpb24gc3Bhd25DaGF0TWVzc2FnZSgpIHtcclxuXHR2YXIgZGF0ZSA9IGN1cnJUaW1lKCk7XHJcblx0XHRcclxuXHQvLyBcclxuXHR2YXIgcG9vbCA9IHRoaXMuX2N0eF9wb29sO1xyXG5cdHZhciBkaXN0UG9vbCA9IFtdO1xyXG5cdHZhciBhY2N1bSA9IDA7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb29sLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgaW5mID0gcG9vbFtpXS5nZXRJbmZsdWVuY2UoKTtcclxuXHRcdGlmIChpbmYgPCAwKSBpbmYgPSAwO1xyXG5cdFx0XHJcblx0XHRhY2N1bSArPSBpbmY7XHJcblx0XHRkaXN0UG9vbC5wdXNoKGFjY3VtKTtcclxuXHR9XHJcblx0XHJcblx0dmFyIGluZGV4ID0gTWF0aC5yYW5kb20oKSAqIGFjY3VtO1xyXG5cdHZhciBzZWxDdHggPSBudWxsO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcG9vbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0aWYgKGluZGV4ID4gZGlzdFBvb2xbaV0pIGNvbnRpbnVlO1xyXG5cdFx0c2VsQ3R4ID0gcG9vbFtpXTsgYnJlYWs7XHJcblx0fVxyXG5cdFxyXG5cdC8vQ29udGV4dCB0byBwdWxsIGZyb20gaXMgbm93IHNlbGVjdGVkXHJcblx0dmFyIG1zZyA9IHNlbEN0eC5nZXRDaGF0TWVzc2FnZShkYXRlKTtcclxuXHRcclxufVxyXG5DaGF0LnNwYXduQ2hhdE1lc3NhZ2UgPSBzcGF3bkNoYXRNZXNzYWdlO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4vKipcclxuICogXHJcbiAqL1xyXG5mdW5jdGlvbiBVc2VyKG9iail7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFVzZXIpKSByZXR1cm4gbmV3IFVzZXIob2JqKTtcclxuXHRcclxuXHRleHRlbmQodGhpcywgb2JqKTtcclxufVxyXG5Vc2VyLnByb3RvdHlwZSA9IHtcclxuXHRuYW1lIDogbnVsbCxcclxuXHRjb2xvciA6IFwiIzAwMDAwMFwiLFxyXG5cdHBvc3Rtc2cgOiBcIlwiLFxyXG5cdHByZW1zZyA6IFwiXCIsXHJcblx0YmFkZ2VzIDogbnVsbCxcclxuXHRcclxuXHRuZXh0VGltZVRhbGs6IDAsIC8vbmV4dCB0aW1lIHRoaXMgdXNlciBpcyBhbGxvd2VkIHRvIHRhbGtcclxuXHRsYXN0VGltZW91dDogMCwgLy90aGUgbGFzdCB0aW1lb3V0IHRoaXMgdXNlciBoYWQsIGluIHNlY29uZHMuIE1vcmUgdGhhbiA1IHNlY29uZHMgaW5kaWNhdGVzIGEgYmFuIG1vbWVudC5cclxuXHRcclxufTtcclxuIiwiLy8gZG9uZ2VyLmpzXHJcbi8vIEZvciBlYXN5IGRlZmluaXRpb24gb2YgZG9uZ2VycyBhbmQgVHdpdGNoIGVtb3Rlc1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0ZG9uZ2VyZnkgOiBmdW5jdGlvbihzdHIpIHtcclxuXHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFw8ZDooXFx3KylcXD4vaWcsIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XHJcblx0XHRcdHJldHVybiBkb25nZXJzW3AxXSB8fCBcIlwiO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHR0d2l0Y2hpZnkgOiBmdW5jdGlvbihzdHIpIHtcclxuXHRcdHJldHVybiBzdHIucmVwbGFjZSh0d2l0Y2hFbW90ZVBhdHRlcm4sIGZ1bmN0aW9uKG1hdGNoKXtcclxuXHRcdFx0cmV0dXJuICc8c3BhbiBjbGFzcz1cInR3aXRjaGVtb3RlIGVtLScrbWF0Y2grJ1wiPjwvc3Bhbj4nO1xyXG5cdFx0fSk7XHJcblx0fSxcclxufVxyXG5cclxudmFyIHR3aXRjaEVtb3RlUGF0dGVybiA9IG5ldyBSZWdFeHAoW1xyXG5cdFwiRGFuc0dhbWVcIixcclxuXHRcIlByYWlzZUl0XCIsXHJcblx0XCJCaWJsZVRodW1wXCIsXHJcblx0XCJCbG9vZFRyYWlsXCIsXHJcblx0XCJQSlNhbHRcIixcclxuXHRcIkJhYnlSYWdlXCIsXHJcblx0XCJIZXlHdXlzXCIsXHJcblx0XCJCaW9uaWNCdW5pb25cIixcclxuXHRcIlJlc2lkZW50U2xlZXBlclwiLFxyXG5cdFwiV2luV2FrZXJcIixcclxuXHRcIlNoaWJlWlwiLFxyXG5cdFwiQmlnQnJvdGhlclwiLFxyXG5cdFwiRGF0U2hlZmZ5XCIsXHJcblx0XCJCcm9rZUJhY2tcIixcclxuXHRcIkVsZUdpZ2dsZVwiLFxyXG5cdFwiVHJpSGFyZFwiLFxyXG5cdFwiT01HU2Nvb3RzXCIsXHJcblx0XCJQb2dDaGFtcFwiLFxyXG5cdFwiS2FwcGFcIixcclxuXHRcIlNvb25lckxhdGVyXCIsXHJcblx0XCJLYXBwYUhEXCIsXHJcblx0XCJCcmFpblNsdWdcIixcclxuXHRcIlN3aWZ0UmFnZVwiLFxyXG5cdFwiRmFpbEZpc2hcIixcclxuXHRcIk1yRGVzdHJ1Y3RvaWRcIixcclxuXHRcIkRCU3R5bGVcIixcclxuXHRcIk9waWVPUFwiLFxyXG5cdFwiR2FzSm9rZXJcIixcclxuXHRcIjRIZWFkXCIsXHJcblx0XCJLZXZpblR1cnRsZVwiLFxyXG5cdFwiS2VlcG9cIixcclxuXHRcIk9uZUhhbmRcIixcclxuXHRcIktBUE9XXCIsXHJcblx0XCJLcmV5Z2FzbVwiLFxyXG5dLmpvaW4oXCJ8XCIpLCBcImdcIik7XHJcblxyXG52YXIgZG9uZ2VycyA9IHtcclxuXHRcInJpb3RcIiA6IFwi44O94Ly84LqI2YTNnOC6iOC8ve++iVwiLFxyXG5cdFwicmlvdG92ZXJcIjogXCLilIzgvLzguojZhM2c4LqI4Ly94pSQXCIsXHJcblx0XCJzb3BoaXN0aWNhdGVkXCIgOiBcIuODveC8vOC6iNmEzZzgsrDgs4PgvL3vvolcIixcclxuXHRcInByYWlzZVwiIDogXCLgvLwg44GkIOKXlV/il5Ug4Ly944GkXCIsXHJcblx0XCJydW5uaW5nbWFuXCI6IFwi4ZWV4Ly84LqI2YTNnOC6iOC8veGVl1wiLFxyXG5cdFwiZGFuY2VcIiA6IFwi4pmrIOKUjOC8vOC6iNmEzZzguojgvL3ilJgg4pmqXCIsXHJcblx0XCJsZW5ueVwiOiBcIiggzaHCsCDNnMqWIM2hwrApXCIsXHJcblx0XCJkb25nZXJob29kXCI6IFwi4Ly8IMK62YTNn8K6IOC8vCDCutmEzZ/CuiDgvLwgwrrZhM2fwrog4Ly9IMK62YTNn8K6IOC8vSDCutmEzZ/CuiDgvL1cIixcclxuXHRcclxuXHRcInRhYmxlZmxpcFwiIDogXCIo4pWvwrDilqHCsCnila/vuLUg4pS74pSB4pS7XCIsXHJcblx0XCJ0YWJsZWJhY2tcIiA6IFwi4pSs4pSA4pSs44OOKOCyoF/gsqDjg44pXCIsXHJcblx0XCJ0YWJsZWZsaXAyXCIgOiBcIijjg47gsqDnm4rgsqAp44OOIOKUu+KUgeKUu1wiLFxyXG5cdFwidGFibGViYWNrMlwiIDogXCLilKzilIDilKzjg44o4LKg55uK4LKg44OOKVwiLFxyXG5cdFwidGFibGVmbGlwM1wiIDogXCLilLvilIHilLsg77i144O9KGDQlMK0Ke++ie+4tSDilLvilIHilLtcIixcclxuXHRcInRhYmxlYmFjazNcIiA6IFwi4pSs4pSA4pSsIO+4teODvSjgsqBf4LKgKe++ie+4tSDilKzilIDilKxcIixcclxuXHRcInRhYmxlZmxpcDRcIiA6IFwi4pSs4pSA4pSs77u/IO+4tSAvKC7ilqEuIFxcXFzvvIlcIixcclxuXHRcInRhYmxlYmFjazRcIiA6IFwiLSggwrAtwrApLSDjg44o4LKgX+CyoOODjilcIiwgXHJcblx0XHJcblx0XCJ3b29wZXJcIjogXCLljYUo4peV4oC/4peVKeWNhVwiLFxyXG5cdFwiYnJvbnpvbmdlclwiOiBcIuKUlChv0apvKeKUmFwiLFxyXG5cdFwiZG9vdFwiIDogXCLiirnii5vii4so4peQ4oqd4peRKeKLjOKLmuKKuVwiLFxyXG5cdFwiam9sdGlrXCI6IFwi4pWtPDzil5XCsM+JwrDil5U+PuKVrlwiLFxyXG5cdFwibWVnYWRvbmdlclwiIDogXCLilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbFcIixcclxuXHRcInRyYXBuaWNoXCI6IFwi44O94Ly84pyq77mP4pyq4Ly9776JXCIsXHJcbn07XHJcblxyXG5cclxuXHJcbnZhciBjb3B5cGFzdGEgPSB7XHJcblx0XCJyaW90cG9saWNlXCIgOiBbXHJcblx0XHRcIijiloDMvyDMv8S5zK/iloDMvyDMvykgVEhJUyBJUyBUSEUgUklPVCBQT0xJQ0UuIFNUT1AgUklPVElORyBOT1cgKOKWgMy/IMy/xLnMr+KWgMy/IMy/KVwiLFxyXG5cdFx0XCIo4oyQ4pagX+KWoCk9L8y1LyfMvyfMvyDMvyDMvyDjg73gvLzguojZhM2c4LqI4Ly9776JIFRISVMgSVMgVEhFIFJJT1QgUE9MSUNFLCBDRUFTRSBSSU9USU5HIE9SIEkgU0hPT1QgVEhFIERPTkdFUiEhXCIsXHJcblx0XSxcclxuXHRcImxpa2UycmFpc2VcIiA6IFwiSSBsaWtlIHRvIHJhaXNlIG15IERvbmdlciBJIGRvIGl0IGFsbCB0aGUgdGltZSDjg73gvLzguojZhM2c4LqI4Ly9776JIGFuZCBldmVyeSB0aW1lIGl0cyBsb3dlcmVk4pSM4Ly84LqI2YTNnOC6iOC8veKUkCBJIGNyeSBhbmQgc3RhcnQgdG8gd2hpbmUg4pSM4Ly8QNmEzZxA4Ly94pSQQnV0IG5ldmVyIG5lZWQgdG8gd29ycnkg4Ly8IMK62YTNn8K64Ly9IG15IERvbmdlcidzIHN0YXlpbmcgc3Ryb25nIOODveC8vOC6iNmEzZzguojgvL3vvolBIERvbmdlciBzYXZlZCBpcyBhIERvbmdlciBlYXJuZWQgc28gc2luZyB0aGUgRG9uZ2VyIHNvbmchIOGVpuC8vOC6iNmEzZzguojgvL3hlaRcIixcclxuXHRcIm1lZ2Fkb25nZXJcIiA6IFtcclxuXHRcdFwi4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWxIFBSQUlTRSBUSEUgTUVHQS1ET05HRVIg4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWxXCIsXHJcblx0XHRcIuODveC8vOC6iNmEzZzguojgvL3vvokgZG9uZ2VyJ3MgZG9uZ2l0ZSBpcyByZWFjdGluZyB0byB0aGUgbWVnYSBzdG9uZSAoKOODveC8vOC6iNmEzZzguojgvL3vvokpKSBkb25nZXIgZXZvbHZlZCBpbnRvIG1lZ2EgZG9uZ2VyIFxcXCLilbIv4Ly84LqI4LqI2YTNnOC6iOC6iOC8vS/ilbFcXFwiIG1lZ2EgZG9uZ2VyIHVzZWQgcmFpc2UsIGl0J3Mgc3VwZXIgZWZmZWN0aXZlIHdpbGQgbG93ZXJlZCBkb25nIGZhaW50ZWRcIixcclxuXHRcdFwi44O94Ly84LqI2YTNnOC6iOC8ve++iSBEb25nZXIgaXMgcmVhY3RpbmcgdG8gdGhlIERvbmdlcml0ZSEgLC/ilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbEsIERvbmdlciBNZWdhIEV2b2x2ZWQgaW50byBNZWdhIERvbmdlciFcIixcclxuXHRcdFwiRE9OR0VSJ1MgRE9OR0VSSVRFIElTIFJFQUNUSU5HIFRPIFRIRSBNRUdBIFJJTkchICwv4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWx77u/LCBNRUdBIFJJT1QgLC/ilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbHvu78sXCIsXHJcblx0XSxcclxuXHRcInJpcGRvb2ZcIiA6IFwiSS4uLiBJIGp1c3Qgd2FudGVkIHRvIGRlcG9zaXQgQmlkb29mLiBTaGUgd2FzIHNvIGdvb2QgdG8gdXMuLi4gYWx3YXlzIHNvIGxveWFsLiBXaGVuIHNoZSBjb3VsZG4ndCBldm9sdmUgZm9yIHVzLCBzaGUgd2VudCB0byB0aGUgRGF5Y2FyZSBoYXBwaWx5LCBhbmQgdGhlbiBjYW1lIGJhY2sgaGFwcGlseSwgd2VhcmluZyB0aGF0IHN0dXBpZCBncmluIG9uIGhlciBmYWNlIGFsbCB0aGUgd2hpbGUuIFdoZW4gd2UgYXNrZWQgaGVyIHRvIGdvIHRvIHRoZSBQQywgc2hlIG5ldmVyIG9uY2UgY29tcGxhaW5lZC4gU2hlIHdhcyBqdXN0IHRoZXJlIGZvciB1cywgbG95YWxseSwgdGhlIHdheSBzaGUgYWx3YXlzIGhhZCBiZWVuLi4uLkFuZCB0aGVuIHdlIGtpbGxlZCBoZXIuIFJJUCBEb29mLCB5b3Ugd2lsbCBiZSBtaXNzZWQuIDooXCIsXHJcblx0XCJ0d2l0Y2hcIiA6IFtcclxuXHRcdFwiSSdtIGEgVHdpdGNoIGVtcGxveWVlIGFuZCBJJ20gc3RvcHBpbmcgYnkgdG8gc2F5IHlvdXIgVHdpdGNoIGNoYXQgaXMgb3V0IG9mIGNvbnRyb2wuIEkgaGF2ZSByZWNlaXZlZCBzZXZlcmFsIGNvbXBsYWludHMgZnJvbSB5b3VyIHZlcnkgb3duIHZpZXdlcnMgdGhhdCB0aGVpciBjaGF0IGV4cGVyaWVuY2UgaXMgcnVpbmVkIGJlY2F1c2Ugb2YgY29uc3RhbnQgRW1vdGUgYW5kIENvcHlwYXN0YSBzcGFtbWluZy4gVGhpcyB0eXBlIHVuYWNjZXB0YWJsZSBieSBUd2l0Y2gncyBzdGFuZGFyZHMgYW5kIGlmIHlvdXIgbW9kcyBkb24ndCBkbyBzb21ldGhpbmcgYWJvdXQgaXQgd2Ugd2lsbCBiZSBmb3JjZWQgdG8gc2h1dCBkb3duIHlvdXIgY2hhbm5lbC4gV2lzaCB5b3UgYWxsIHRoZSBiZXN0IC0gVHdpdGNoXCIsXHJcblx0XHQvKiBQYXJrIHZlcnNpb24gKi9cIkknbSBhIFR3aXRjaCBlbXBsb3llZSBhbmQgSSdtIHN0b3BwaW5nIGJ5IHRvIHNheSB5b3VyIFR3aXRjaCBjaGF0IGxvb2tzIHRvbyBtdWNoIGxpa2UgdGhlIG9mZmljaWFsIHR3aXRjaCBjaGF0LiBJIGhhdmUgcmVjZWl2ZWQgc2V2ZXJhbCBjb21wbGFpbnRzIGZyb20geW91ciB2ZXJ5IG93biB2aXNpdG9ycyB0aGF0IHRoZWlyIGNoYXQgZXhwZXJpZW5jZSBpcyBydWluZWQgYmVjYXVzZSBvZiBjb25zdGFudCBjaGF0IGJlaW5nIHNwYW1tZWQgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZS4gVGhpcyBpcyB1bmFjY2VwdGFibGUgYnkgVHdpdGNoJ3MgVE9TIGFuZCBpZiB5b3VyIG1vZHMgZG9uJ3QgZG8gc29tZXRoaW5nIGFib3V0IGl0IHdlIHdpbGwgYmUgZm9yY2VkIHRvIHNodXQgZG93biB5b3VyIHBhcmsuIFdpc2ggeW91IGFsbCB0aGUgYmVzdCAtIFR3aXRjaFwiLFxyXG5cdF0sXHJcblx0XCJzdGlsbGF0aGluZ1wiIDogW1xyXG5cdFx0XCJJcyB0cHAgc3RpbGwgYSB0aGluZz9cIixcclxuXHRcdFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/IEthcHBhXCIsXHJcblx0XHRcIklzIFxcXCJJcyB0cHAgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XCIsXHJcblx0XHRcIklzIFxcXCJJcyBcXFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cIixcclxuXHRcdFwiSXMgXFxcIklzIFxcXCJJcyBcXFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XCIsXHJcblx0XHRcIklzIFxcXCJJcyBcXFwiSXMgXFxcIklzIElzIFxcXCJJcyBcXFwiSXMgXFxcIklzIHRwcCBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nPyBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1wiLFxyXG5cdF0sXHJcblx0XCJkYW5jZXJpb3RcIiA6IFtcclxuXHRcdFwi4pmrIOKUjOC8vOC6iNmEzZzguojgvL3ilJggREFOQ0UgUklPVCDimaog4pSU4Ly84LqI2YTNnOC6iOC8veKUkCDimatcIixcclxuXHRcdFwi4pmrIOKUjOC8vOC6iNmEzZzguojgvL3ilJgg4pmqIERBTkNFIFJJT1Qg4pmqIOKUlOC8vOC6iNmEzZzguojgvL3ilJAg4pmrXCIsXHJcblx0XHRcIuKZqyDilIzgvLzguojZhM2c4LqI4Ly94pSYIOKZqiBEQU5DRSBSSU9UIOKZqyDilIzgvLzguojZhM2c4LqI4Ly94pSYIOKZqlwiLFxyXG5cdF0sXHJcblx0XCJyaW90XCIgOiBbXHJcblx0XHRcIuODveC8vOC6iNmEzZzguojgvL3vvokgUklPVCDjg73gvLzguojZhM2c4LqI4Ly9776JXCIsXHJcblx0XSxcclxuXHRcImxldGl0ZG9uZ1wiIDogXCLjg73gvLzguojZhM2c4LqI4Ly9776JIExFVCBJVCBET05HLCBMRVQgSVQgRE9ORywgQ09VTEROJ1QgUklPVCBCQUNLIEFOWU1PUkUuIExFVCBJVCBET05HLCBMRVQgSVQgRE9ORywgTEVUJ1MgR0VUIEJBQ0sgVE8gVEhFIExPUkUsIEkgRE9OJ1QgQ0FSRSBUSEFUIFRIRSBET05HRVJTIFdFUkUgR09ORSwgTEVUIFRIRSBET05HUyBSQUdFIE9OLCBUSEUgUklPVCBORVZFUiBCT1RIRVJFRCBNRSBBTllXQVkuIOODveC8vOC6iNmEzZzguojgvL3vvolcIixcclxuXHRcclxuXHRcImRvbnRzcGFtXCIgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBhID0gXCJzcGFtXCI7XHJcblx0XHRjb25zdCByZXBsID0gW1wiUklPVFwiLCBcImJlYXQgbWlzdHlcIiwgXCLgvLwg44GkIOKXlV/il5Ug4Ly944GkXCJdO1xyXG5cdFx0XHJcblx0XHRjb25zdCBzcGFtID0gXCJHdXlzIGNhbiB5b3UgcGxlYXNlIG5vdCBbJWRdIHRoZSBjaGF0LiBNeSBtb20gYm91Z2h0IG1lIHRoaXMgbmV3IGxhcHRvcCBhbmQgaXQgZ2V0cyByZWFsbHkgaG90IHdoZW4gdGhlIGNoYXQgaXMgYmVpbmcgWyVkXWVkLiBOb3cgbXkgbGVnIGlzIHN0YXJ0aW5nIHRvIGh1cnQgYmVjYXVzZSBpdCBpcyBnZXR0aW5nIHNvIGhvdC4gUGxlYXNlLCBpZiB5b3UgZG9u4oCZdCB3YW50IG1lIHRvIGdldCBidXJuZWQsIHRoZW4gZG9udCBbJWRdIHRoZSBjaGF0XCI7XHJcblx0fSxcclxuXHRcclxuXHRcImF3ZWZ1bGh1bWFuc1wiIDogXCJIdW1hbnMgYXJlIGF3ZnVsLiBUaGlzIHBsYW5ldCB3b3VsZCBiZSB3YXkgYmV0dGVyIGlmIHRoZXJlIHdlcmUgbm8gaHVtYW5zIGluIGl0LiBUcnVlIHN0b3J5LiBET04nVCBDT1BZIFRISVNcIixcclxuXHRcInJ1aW5lZGNoYXRcIiA6IFwiWW91IGd1eXMgYXJlIHJ1aW5pbmcgbXkgdHdpdGNoIGNoYXQgZXhwZXJpZW5jZS4gSSBjb21lIHRvIHRoZSB0d2l0Y2ggY2hhdCBmb3IgbWF0dXJlIGNvbnZlcnNhdGlvbiBhYm91dCB0aGUgZ2FtZXBsYXksIG9ubHkgdG8gYmUgYXdhcmRlZCB3aXRoIGthcHBhIGZhY2VzIGFuZCBmcmFua2VyenMuIFBlb3BsZSB3aG8gc3BhbSBzYWlkIGZhY2VzIG5lZWQgbWVkaWNhbCBhdHRlbnRpb24gdXRtb3N0LiBUaGUgdHdpdGNoIGNoYXQgaXMgc2VyaW91cyBidXNpbmVzcywgYW5kIHRoZSBtb2RzIHNob3VsZCByZWFsbHkgcmFpc2UgdGhlaXIgZG9uZ2Vycy5cIixcclxuXHRcImdvb2dsZWFkbWluXCIgOiBcIkhlbGxvIGV2ZXJ5b25lLCB0aGlzIGlzIHRoZSBHb29nbGUgQWRtaW4gaGVyZSB0byByZW1pbmQgeW91IGFsbCB0aGF0IHdoaWxlIHdlIGxvdmUgdGhlIGNoYXQgZXhwZXJpZW5jZSwgcGxlYXNlIHJlZnJhaW4gZnJvbSBjb3B5IHBhc3RpbmcgaW4gdGhlIGNoYXQuIFRoaXMgcnVpbnMgdGhlIGF0bW9zcGhlcmUgYW5kIG1ha2VzIGV2ZXJ5Ym9keeKAmXMgY2hhdCBleHBlcmllbmNlIHdvcnNlIG92ZXJhbGwuIFRoYW5rIHlvdSBhbmQgcmVtZW1iZXIgdG8gbGluayB5b3VyIFR3aXRjaCBhbmQgR29vZ2xlKyBhY2NvdW50IHRvZGF5IVwiLFxyXG5cdFwiYmFkc3RhZGl1bXJlcXVlc3RcIiA6IFwiV293IDAvMTAgdG8gdGhlIGd1eSB3aG8gdGhvdWdodCBvZiB0aGlzIHJlcXVlc3QsIEFQUExBVVNFIENMQVAgQ0xBUCBMQURZIEdBR0EgQVBQTEFVU0UgQVBQTEFVU0UgQVBQTEFVU0VcIixcclxufTtcclxuXHJcbi8vU3RhcmJvbHRfb21lZ2EgS1poZWxnaGFzdCIsIi8vIGNoYXQvdXNlcmxpc3QuanNcclxuLy8gVGhlIGxpc3Qgb2YgdXNlcnMgd2hvIHdpbGwgYXBwZWFyIGluIGNoYXQsIHdpdGggaW5mbyBhc3NvY2lhdGVkIHdpdGggdGhlbS5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gW1xyXG57IGNvbG9yOiBcIiMwMDAwMDBcIiwgbmFtZTogXCJQYXJrVmlzaXRvclwiLFx0XHRcdHBsYXllcjogdHJ1ZSwgfSxcclxuXHJcbnsgY29sb3I6IFwiIzAwRkYwMFwiLCBuYW1lOiBcIlR1c3RpbjIxMjFcIiwgXHRcdFx0Y29udHJpYnV0b3I6IHRydWUsIH0sXHJcblxyXG57IGNvbG9yOiBcIiNGRjAwMDBcIiwgbmFtZTogXCJGYWl0aGZ1bGZvcmNlXCIsIFx0XHRcdGNoYXRsZWFkZXI6IHRydWUsIHBvc3Rtc2c6IFwiQmxvb2RUcmFpbFwiLCB9LFxyXG57IGNvbG9yOiBcIiNGRjAwMDBcIiwgbmFtZTogXCJaMzNrMzNcIixcdFx0XHRcdFx0Y2hhdGxlYWRlcjogdHJ1ZSwgcHJlbXNnOiBcIkRCU3R5bGVcIiwgfSxcclxuXHJcblxyXG5cclxuXTtcclxuXHJcbiIsIi8vIGdhbWVzdGF0ZS5qc1xyXG4vLyBcclxuXHJcbiQuY29va2llLmpzb24gPSB0cnVlO1xyXG5cclxudmFyIGdhbWVTdGF0ZSA9XHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNhdmVkID0gJC5jb29raWUoe3BhdGg6IEJBU0VVUkx9KTtcclxuXHRcdGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGUgPSBzYXZlZC5wbGF5ZXJTcHJpdGU7XHJcblx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbiA9IHNhdmVkLm1hcFRyYW5zaXRpb247XHJcblx0XHRcclxuXHRcdGdhbWVTdGF0ZS5pbmZvZGV4LnJlZ2lzdGVyID0gSlNPTi5wYXJzZSgkLmJhc2U2NC5kZWNvZGUoc2F2ZWQuaW5mb2RleCkpO1xyXG5cdH0sXHJcblx0XHJcblx0c2F2ZUxvY2F0aW9uOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvL0luc2VydCBpdGVtcyB0byBiZSBzYXZlZCBoZXJlXHJcblx0XHR2YXIgbyA9IHtcclxuXHRcdFx0bmV4dE1hcDogb3B0cy5tYXAgfHwgb3B0cy5uZXh0TWFwIHx8IGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLm5leHRNYXAsXHJcblx0XHRcdHdhcnA6IG9wdHMud2FycCB8fCBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi53YXJwLFxyXG5cdFx0XHRhbmltT3ZlcnJpZGU6IFxyXG5cdFx0XHRcdChvcHRzLmFuaW0gIT09IHVuZGVmaW5lZCk/IG9wdHMuYW5pbSA6IFxyXG5cdFx0XHRcdChvcHRzLmFuaW1PdmVycmlkZSAhPT0gdW5kZWZpbmVkKT8gb3B0cy5hbmltT3ZlcnJpZGUgOiBcclxuXHRcdFx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5hbmltT3ZlcnJpZGUsXHJcblx0XHR9XHJcblx0XHQkLmNvb2tpZShcIm1hcFRyYW5zaXRpb25cIiwgbywge3BhdGg6IEJBU0VVUkx9KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBNYXAgVHJhbnNpdGlvblxyXG5cdG1hcFRyYW5zaXRpb24gOiB7XHJcblx0XHRuZXh0TWFwIDogXCJpQ2h1cmNoT2ZIZWxpeFwiLFxyXG5cdFx0d2FycDogMHgxMCxcclxuXHRcdGFuaW1PdmVycmlkZTogMCxcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXllclNwcml0ZSA6IFwibWVsb2R5W2hnX3ZlcnRtaXgtMzJdLnBuZ1wiLFxyXG5cdFxyXG59O1xyXG5cclxuLy8gSW5mb2RleCBmdW5jdGlvbnNcclxuZ2FtZVN0YXRlLmluZm9kZXggPSB7XHJcblx0cmVnaXN0ZXI6IHt9LFxyXG5cdHNlZW46IDAsXHJcblx0Zm91bmQ6IDAsXHJcblx0XHJcblx0X19tYXJrOiBmdW5jdGlvbihjb250YWluZXIsIHVybCwgbWFyaykge1xyXG5cdFx0dmFyIGNvbXAgPSB1cmwuc2hpZnQoKTtcclxuXHRcdHZhciBvbGQgPSBjb250YWluZXJbY29tcF07XHJcblx0XHRpZiAoIXVybC5sZW5ndGgpIHtcclxuXHRcdFx0Ly8gV2UncmUgYXQgdGhlIGVuZCBvZiB0aGUgVVJMLCB0aGlzIHNob3VsZCBiZSBhIGxlYWYgbm9kZVxyXG5cdFx0XHRpZiAoIW9sZCkgb2xkID0gY29udGFpbmVyW2NvbXBdID0gMDtcclxuXHRcdFx0aWYgKHR5cGVvZiBvbGQgIT09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVSTCBkb2VzIG5vdCBwb2ludCB0byBsZWFmIG5vZGUhXCIpO1xyXG5cdFx0XHRjb250YWluZXJbY29tcF0gfD0gbWFyaztcclxuXHRcdFx0cmV0dXJuIG9sZDtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1N0aWxsIGdvaW5nIGRvd24gdGhlIHVybFxyXG5cdFx0XHRpZiAoIW9sZCkgb2xkID0gY29udGFpbmVyW2NvbXBdID0ge307XHJcblx0XHRcdHJldHVybiB0aGlzLl9fbWFyayhvbGQsIHVybCwgbWFyayk7IC8vdGFpbCBjYWxsXHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRtYXJrU2VlbjogZnVuY3Rpb24odXJsKSB7XHJcblx0XHQvLyB2YXIgY29tcCA9IHVybC5zcGxpdChcIi5cIik7XHJcblx0XHQvLyB2YXIgcmVnID0gZ2FtZVN0YXRlLmluZm9kZXgucmVnaXN0ZXI7IC8vW3VybF0gfD0gMTsgLy9zZXQgdG8gYXQgbGVhc3QgMVxyXG5cdFx0XHJcblx0XHQvLyBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXAubGVuZ3RoLTE7IGkrKykge1xyXG5cdFx0Ly8gXHRyZWcgPSByZWdbY29tcFtpXV0gfHwge307XHJcblx0XHQvLyB9XHJcblx0XHQvLyByZWdbXVxyXG5cdFx0dmFyIHJlcyA9IHRoaXMuX19tYXJrKHRoaXMucmVnaXN0ZXIsIHVybC5zcGxpdChcIi5cIiksIDEpO1xyXG5cdFx0aWYgKHJlcyA9PSAwKSB7IHRoaXMuc2VlbisrOyB9XHJcblx0fSxcclxuXHRtYXJrRm91bmQ6IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0Ly8gZ2FtZVN0YXRlLmluZm9kZXhbdXJsXSB8PSAyOyAvL3NldCB0byBhdCBsZWFzdCAyXHJcblx0XHR2YXIgcmVzID0gdGhpcy5fX21hcmsodGhpcy5yZWdpc3RlciwgdXJsLnNwbGl0KFwiLlwiKSwgMik7XHJcblx0XHRpZiAocmVzID09IDApIHsgdGhpcy5zZWVuKys7IHRoaXMuZm91bmQrKzsgfVxyXG5cdFx0ZWxzZSBpZiAocmVzID09IDEpIHsgdGhpcy5mb3VuZCsrOyB9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRcclxufTsiLCIvLyBnbG9iYWxzLmpzXHJcblxyXG53aW5kb3cuQ09ORklHID0ge1xyXG5cdHNwZWVkIDoge1xyXG5cdFx0cGF0aGluZzogMC4yNSxcclxuXHRcdGFuaW1hdGlvbjogMyxcclxuXHRcdGJ1YmJsZXBvcDogMC45NSxcclxuXHR9LFxyXG5cdHRpbWVvdXQgOiB7XHJcblx0XHR3YWxrQ29udHJvbCA6IDEsXHJcblx0fVxyXG59O1xyXG5cclxud2luZG93LkRFQlVHID0ge307XHJcblxyXG4vL09uIFJlYWR5XHJcbiQoZnVuY3Rpb24oKXtcclxuXHRcclxufSk7XHJcblxyXG53aW5kb3cuU291bmRNYW5hZ2VyID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvc291bmRtYW5hZ2VyXCIpO1xyXG53aW5kb3cuTWFwTWFuYWdlciA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL21hcG1hbmFnZXJcIik7XHJcbndpbmRvdy5BY3RvclNjaGVkdWxlciA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL2FjdG9yc2NoZWR1bGVyXCIpO1xyXG53aW5kb3cuR0MgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy9nYXJiYWdlLWNvbGxlY3RvclwiKTtcclxud2luZG93LlVJID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvdWktbWFuYWdlclwiKTtcclxud2luZG93LkNoYXQgPSByZXF1aXJlKFwiLi9jaGF0L2NvcmUuanNcIik7XHJcblxyXG53aW5kb3cuY3VycmVudE1hcCA9IG51bGw7XHJcbndpbmRvdy5nYW1lU3RhdGUgPSByZXF1aXJlKFwiLi9nYW1lc3RhdGVcIik7XHJcbiIsIi8vIGFjdG9yc2NoZWR1bGVyLmpzXHJcbi8vIERlZmluZXMgdGhlIEFjdG9yIFNjaGVkdWxlclxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIEFjdG9yU2NoZWR1bGVyKCkge1xyXG5cdFxyXG59XHJcbmV4dGVuZChBY3RvclNjaGVkdWxlci5wcm90b3R5cGUsIHtcclxuXHRhY3Rvcm1hcCA6IHt9LFxyXG5cdF9fZm9yY2VEYXRlOiBudWxsLFxyXG5cdFxyXG5cdGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBkYXRlID0gdGhpcy5fX2ZvcmNlRGF0ZSB8fCBuZXcgRGF0ZSgpO1xyXG5cdFx0cmV0dXJuIChkYXRlLmdldEhvdXJzKCkgKiAxMDApICsgKGRhdGUuZ2V0SG91cnMoKSk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogQ3JlYXRlcyBhIHNjaGVkdWxlIGZvciBhbiBhY3RvciBnaXZlbiBhIGxpc3Qgb2YgbG9jYXRpb25zLlxyXG5cdCAqIEEgU2NoZWR1bGUgaXMgYSBsaXN0IG9mIHRpbWVzIHRvIGxvY2F0aW9ucyBzaG93aW5nIHdoZW4gYSBnaXZlbiBhY3RvclxyXG5cdCAqIGlzIGluIGEgbWFwIGZvciB0aGlzIGRheS4gUGFzc2VkIGlzIGEgbGlzdCBvZiBsb2NhdGlvbnMgdGhhdCB0aGUgYWN0b3JcclxuXHQgKiBtaWdodCB2aXNpdCBpbiBhIG5vcm1hbCBkYXkuIE5vdCBwYXNzZWQgYXJlIHBsYWNlcyB0aGF0IHRoZSBhY3RvciB3aWxsIFxyXG5cdCAqIGFsd2F5cyBiZSBhdCBhIGdpdmVuIHRpbWUgKHVubGVzcyB0aGUgYWN0b3IgcmFuZG9tbHkgc2hvd3MgdXAgdGhlcmUgbm9ybWFsbHkpLlxyXG5cdCAqIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyBhIHJhbmRvbWl6ZWQgc2NoZWR1bGUsIHdpdGggcmFuZG9taXplZCBhbW91bnRzIG9mXHJcblx0ICogdGltZSBzcGVudCBhdCBhbnkgZ2l2ZW4gcGxhY2UuXHJcblx0ICovXHJcblx0Y3JlYXRlU2NoZWR1bGU6IGZ1bmN0aW9uKG1lLCBzY2hlZHVsZURlZikge1xyXG5cdFx0Ly9HcmFiIG1lbW9pemVkIHNjaGVkdWxlXHJcblx0XHR2YXIgc2NoZWR1bGUgPSB0aGlzLmFjdG9ybWFwW21lLmlkXTtcclxuXHRcdGlmICghc2NoZWR1bGUpIHsgLy9JZiBubyBzdWNoIHRoaW5nLCBvciBleHBpcmVkXHJcblx0XHRcdHNjaGVkdWxlID0ge307XHJcblx0XHRcdGZvciAodmFyIHRpbWVSYW5nZSBpbiBzY2hlZHVsZURlZikge1xyXG5cdFx0XHRcdHZhciBsb2NhdGlvbiA9IHNjaGVkdWxlRGVmW3RpbWVSYW5nZV07XHJcblx0XHRcdFx0dGltZVJhbmdlID0gTnVtYmVyKHRpbWVSYW5nZSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly9Qcm9jZXNzXHJcblx0XHRcdFx0aWYgKHR5cGVvZiBsb2NhdGlvbiA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRzY2hlZHVsZVt0aW1lUmFuZ2VdID0gbG9jYXRpb247XHJcblx0XHRcdFx0fSBcclxuXHRcdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkobG9jYXRpb24pKSB7XHJcblx0XHRcdFx0XHR2YXIgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGxvY2F0aW9uLmxlbmd0aCk7XHJcblx0XHRcdFx0XHRzY2hlZHVsZVt0aW1lUmFuZ2VdID0gbG9jYXRpb25baV07XHJcblx0XHRcdFx0fSBcclxuXHRcdFx0XHRlbHNlIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0c2NoZWR1bGVbdGltZVJhbmdlXSA9IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTcHJlYWQgdGhlIHNjaGVkdWxlIGV2ZW5cclxuXHRcdFx0dmFyIGlkID0gbnVsbDtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyNDAwOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoaSAlIDEwMCA+IDU5KSB7IGkgKz0gMTAwIC0gKGklMTAwKTsgfSAvL3NraXAgNjAtOTkgbWludXRlc1xyXG5cdFx0XHRcdGlmIChzY2hlZHVsZVtpXSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRpZCA9IHNjaGVkdWxlW2ldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzY2hlZHVsZVtpXSA9IGlkO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmFjdG9ybWFwW21lLmlkXSA9IHNjaGVkdWxlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHNjaGVkdWxlO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBBY3RvclNjaGVkdWxlcigpO1xyXG4iLCIvLyBnYXJiYWdlLWNvbGxlY3Rvci5qc1xyXG4vLyBBbGxvY2F0ZXMgYWxsIHRoZSB2YXJpb3VzIGRpc3Bvc2FibGUgaXRlbXMsIHN1Y2ggYXMgZ2VvbWV0cnkgYW5kIGxpc3RlbmVycywgZm9yXHJcbi8vIGxhdGVyIGRpc3Bvc2FsLlxyXG5cclxudmFyIFJFVk9LRV9VUkxTID0gISFVUkwucmV2b2tlT2JqZWN0VVJMO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEdhcmJhZ2VDb2xsZWN0b3IoKSB7XHJcblx0dGhpcy5iaW5zID0ge307XHJcblx0dGhpcy5hbGxvY2F0ZUJpbihcIl9kZWZhdWx0XCIpO1xyXG59XHJcblxyXG5HYXJiYWdlQ29sbGVjdG9yLnByb3RvdHlwZS5hbGxvY2F0ZUJpbiA9IGZ1bmN0aW9uKGJpbklkKSB7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF0gPSBuZXcgR2FyYmFnZUJpbigpO1xyXG59XHJcblxyXG5HYXJiYWdlQ29sbGVjdG9yLnByb3RvdHlwZS5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBiaW5JZCl7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBQdXR0aW5nIG9iamVjdCBpbiBkZWZhdWx0IGJpbi4gQmluSUQ6XCIsIGJpbklEKTtcclxuXHRcdGJpbiA9IHRoaXMuYmluc1tcIl9kZWZhdWx0XCJdO1xyXG5cdH1cclxuXHRiaW4uY29sbGVjdChvYmopO1xyXG59XHJcblxyXG5HYXJiYWdlQ29sbGVjdG9yLnByb3RvdHlwZS5jb2xsZWN0VVJMID0gZnVuY3Rpb24ob2JqLCBiaW5JZCl7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBQdXR0aW5nIG9iamVjdCBpbiBkZWZhdWx0IGJpbi4gQmluSUQ6XCIsIGJpbklEKTtcclxuXHRcdGJpbiA9IHRoaXMuYmluc1tcIl9kZWZhdWx0XCJdO1xyXG5cdH1cclxuXHRiaW4uY29sbGVjdFVSTChvYmopO1xyXG59XHJcblxyXG5HYXJiYWdlQ29sbGVjdG9yLnByb3RvdHlwZS5nZXRCaW4gPSBmdW5jdGlvbihiaW5JZCkge1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgR2V0dGluZyBkZWZhdWx0IGJpbi4gQmluSUQ6XCIsIGJpbklEKTtcclxuXHRcdGJpbiA9IHRoaXMuYmluc1tcIl9kZWZhdWx0XCJdO1xyXG5cdH1cclxuXHRyZXR1cm4gYmluO1xyXG59XHJcblxyXG5HYXJiYWdlQ29sbGVjdG9yLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oYmluSWQpIHtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIENhbm5vdCBkaXNwb3NlISBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHRcclxuXHRiaW4uZGlzcG9zZSgpO1xyXG5cdFxyXG5cdGJpbiA9IG51bGw7XHJcblx0ZGVsZXRlIHRoaXMuYmluc1tiaW5JZF07XHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gR2FyYmFnZUJpbigpIHtcclxuXHR0aGlzLmRpc3Bvc2FsID0gW107IC8vT2JqZWN0cyB0aGF0IGNhbiBoYXZlIFwiZGlzcG9zZVwiIGNhbGxlZCBvbiB0aGVtXHJcblx0dGhpcy5saXN0ZW5lcnMgPSBbXTsgLy9PYmplY3RzIHdpdGggbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoZW1cclxuXHR0aGlzLnRhZ3MgPSBbXTsgLy9TY3JpcHQgdGFncyBhbmQgb3RoZXIgZGlzcG9zYWJsZSB0YWdzXHJcblx0dGhpcy5zcGVjaWZpY0xpc3RlbmVycyA9IFtdOyAvL1NwZWNpZmljIGxpc3RlbmVyc1xyXG5cdFxyXG5cdHRoaXMuYmxvYnVybHMgPSBbXTsgLy9PYmplY3QgVVJMcyB0aGF0IGNhbiBiZSByZXZva2VkIHdpdGggVVJMLnJldm9rZU9iamVjdFVSTFxyXG59XHJcbkdhcmJhZ2VCaW4ucHJvdG90eXBlID0ge1xyXG5cdGNvbGxlY3Q6IGZ1bmN0aW9uKG9iaikge1xyXG5cdFx0aWYgKG9iai5kaXNwb3NlKSB7XHJcblx0XHRcdHRoaXMuZGlzcG9zYWwucHVzaChvYmopO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9iai5yZW1vdmVBbGxMaXN0ZW5lcnMpIHtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnMucHVzaChvYmopO1xyXG5cdFx0fVxyXG5cdFx0aWYgKChvYmogaW5zdGFuY2VvZiAkKSB8fCBvYmoubm9kZU5hbWUpIHtcclxuXHRcdFx0dGhpcy50YWdzLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGNvbGxlY3RVUkw6IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0aWYgKCFSRVZPS0VfVVJMUykgcmV0dXJuO1xyXG5cdFx0aWYgKHR5cGVvZiB1cmwgIT0gXCJzdHJpbmdcIikgcmV0dXJuO1xyXG5cdFx0dGhpcy5ibG9idXJscy5wdXNoKHVybCk7XHJcblx0fSxcclxuXHRcclxuXHRjb2xsZWN0TGlzdGVuZXI6IGZ1bmN0aW9uKG9iaiwgZXZ0LCBsaXN0ZW5lcikge1xyXG5cdFx0dGhpcy5zcGVjaWZpY0xpc3RlbmVycy5wdXNoKHtcclxuXHRcdFx0b2JqOiBvYmosICAgZXZ0OiBldnQsICAgbDogbGlzdGVuZXJcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0ZGlzcG9zZTogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGlzcG9zYWwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5kaXNwb3NhbFtpXS5kaXNwb3NlKCk7XHJcblx0XHRcdHRoaXMuZGlzcG9zYWxbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5kaXNwb3NhbCA9IG51bGw7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnNbaV0ucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XHJcblx0XHRcdHRoaXMubGlzdGVuZXJzW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMubGlzdGVuZXJzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRhZ3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0JCh0aGlzLnRhZ3NbaV0pLnJlbW92ZUF0dHIoXCJzcmNcIikucmVtb3ZlKCk7XHJcblx0XHRcdHRoaXMudGFnc1tpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLnRhZ3MgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIG8gPSB0aGlzLnNwZWNpZmljTGlzdGVuZXJzW2ldO1xyXG5cdFx0XHRvLm9iai5yZW1vdmVMaXN0ZW5lcihvLmV2dCwgby5sKTtcclxuXHRcdFx0dGhpcy5zcGVjaWZpY0xpc3RlbmVyc1tpXSA9IG51bGw7XHJcblx0XHRcdG8gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zcGVjaWZpY0xpc3RlbmVycyA9IG51bGw7XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJsb2J1cmxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5ibG9idXJsc1tpXSk7XHJcblx0XHRcdHRoaXMuYmxvYnVybHNbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5ibG9idXJscyA9IG51bGw7XHJcblx0fSxcclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgR2FyYmFnZUNvbGxlY3RvcigpOyIsIi8vIG1hcG1hbmFnZXIuanNcclxuLy9cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG52YXIgTWFwID0gcmVxdWlyZShcIi4uL21hcC5qc1wiKTtcclxudmFyIERvcml0b0R1bmdlb24gPSByZXF1aXJlKFwiLi4vbW9kZWwvZHVuZ2Vvbi1tYXAuanNcIik7XHJcblxyXG5mdW5jdGlvbiBNYXBNYW5hZ2VyKCkge1xyXG5cdFxyXG59XHJcbmluaGVyaXRzKE1hcE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChNYXBNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdG5leHRNYXA6IG51bGwsXHJcblx0bG9hZEVycm9yOiBudWxsLFxyXG5cdFxyXG5cdHRyYW5zaXRpb25UbyA6IGZ1bmN0aW9uKG1hcGlkLCB3YXJwaW5kZXgsIGFuaW1PdmVycmlkZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcIl9tYXBfd2FycGluZ19cIik7XHJcblx0XHRpZiAobWFwaWQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5uZXh0TWFwID0gbWFwaWQ7XHJcblx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLndhcnAgPSB3YXJwaW5kZXg7XHJcblx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLmFuaW1PdmVycmlkZSA9IGFuaW1PdmVycmlkZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1hcGlkID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ubmV4dE1hcDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Y29uc29sZS53YXJuKFwiQmVnaW5uaW5nIFRyYW5zaXRpb24gdG9cIiwgbWFwaWQpO1xyXG5cclxuXHRcdHZhciBmYWRlT3V0RG9uZSA9IGZhbHNlO1xyXG5cdFx0dmFyIGZpbmlzaGVkRG93bmxvYWQgPSBmYWxzZTtcclxuXHRcdFVJLmZhZGVPdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0VUkuc2hvd0xvYWRpbmdBamF4KCk7XHJcblx0XHRcdGZhZGVPdXREb25lID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbmlzaGVkRG93bmxvYWQgJiYgZmFkZU91dERvbmUpIHtcclxuXHRcdFx0XHRfX2JlZ2luTG9hZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0aWYgKGN1cnJlbnRNYXAgJiYgY3VycmVudE1hcC5pZCA9PSBtYXBpZCkge1xyXG5cdFx0XHQvLyBObyBuZWVkIHRvIGRvd25sb2FkIHRoZSBuZXh0IG1hcFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dmFyIG5tYXAgPSB0aGlzLm5leHRNYXAgPSBuZXcgTWFwKG1hcGlkKTtcclxuXHRcdFx0bm1hcC5vbihcImxvYWQtZXJyb3JcIiwgX19sb2FkRXJyb3IpO1xyXG5cdFx0XHRubWFwLm9uKFwicHJvZ3Jlc3NcIiwgX19wcm9ncmVzc1VwZGF0ZSk7XHJcblx0XHRcdG5tYXAub25jZShcImRvd25sb2FkZWRcIiwgX19maW5pc2hlZERvd25sb2FkKTtcclxuXHRcdFx0bm1hcC5vbmNlKFwibWFwLXN0YXJ0ZWRcIiwgX19tYXBTdGFydCk7XHJcblx0XHRcdFxyXG5cdFx0XHRubWFwLmRvd25sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZEVycm9yKGUpIHtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLnJlbW92ZUxpc3RlbmVyKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcInByb2dyZXNzXCIsIF9fcHJvZ3Jlc3NVcGRhdGUpO1xyXG5cdFx0XHRzZWxmLm5leHRNYXAucmVtb3ZlTGlzdGVuZXIoXCJkb3dubG9hZGVkXCIsIF9fZmluaXNoZWREb3dubG9hZCk7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcIm1hcC1zdGFydGVkXCIsIF9fbWFwU3RhcnQpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5uZXh0TWFwID0gbmV3IERvcml0b0R1bmdlb24oKTtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLm9uKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5vbmNlKFwibWFwLXN0YXJ0ZWRcIiwgX19tYXBTdGFydCk7XHJcblx0XHRcdFxyXG5cdFx0XHRmaW5pc2hlZERvd25sb2FkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbmlzaGVkRG93bmxvYWQgJiYgZmFkZU91dERvbmUpIHtcclxuXHRcdFx0XHRfX2JlZ2luTG9hZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX3Byb2dyZXNzVXBkYXRlKGxvYWRlZCwgdG90YWwpIHtcclxuXHRcdFx0VUkudXBkYXRlTG9hZGluZ1Byb2dyZXNzKGxvYWRlZCwgdG90YWwpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19maW5pc2hlZERvd25sb2FkKCkge1xyXG5cdFx0XHRmaW5pc2hlZERvd25sb2FkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbmlzaGVkRG93bmxvYWQgJiYgZmFkZU91dERvbmUpIHtcclxuXHRcdFx0XHRfX2JlZ2luTG9hZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX2JlZ2luTG9hZCgpIHtcclxuXHRcdFx0aWYgKGN1cnJlbnRNYXApIGN1cnJlbnRNYXAuZGlzcG9zZSgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIj09PT09PT09PT09PUJFR0lOIExPQUQ9PT09PT09PT09PT09PVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcInByb2dyZXNzXCIsIF9fcHJvZ3Jlc3NVcGRhdGUpO1xyXG5cdFx0XHRzZWxmLm5leHRNYXAucmVtb3ZlTGlzdGVuZXIoXCJkb3dubG9hZGVkXCIsIF9fZmluaXNoZWREb3dubG9hZCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjdXJyZW50TWFwID0gc2VsZi5uZXh0TWFwOyBzZWxmLm5leHRNYXAgPSBudWxsO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKERFQlVHICYmIERFQlVHLnJ1bk9uTWFwUmVhZHkpXHJcblx0XHRcdFx0Y3VycmVudE1hcC5vbmNlKFwibWFwLXJlYWR5XCIsIERFQlVHLnJ1bk9uTWFwUmVhZHkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y3VycmVudE1hcC5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX21hcFN0YXJ0KCkge1xyXG5cdFx0XHRjdXJyZW50TWFwLnJlbW92ZUxpc3RlbmVyKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdFxyXG5cdFx0XHRVSS5oaWRlTG9hZGluZ0FqYXgoKTtcclxuXHRcdFx0VUkuZmFkZUluKCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucmVtb3ZlSW5wdXRDb250ZXh0KFwiX21hcF93YXJwaW5nX1wiKTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IE1hcE1hbmFnZXIoKTsiLCIvLyBzb3VuZG1hbmFnZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgU291bmQgTWFuYWdlclxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIGF1ZGlvQ29udGV4dDtcclxuXHJcbnZhciBNQVhfTVVTSUMgPSA4OyAvL01heCBudW1iZXIgb2YgbXVzaWMgdHJhY2tzIGNhY2hlZCBpbiBtZW1vcnlcclxudmFyIE1BWF9TT1VORFMgPSAxNjsgLy9NYXggbnVtYmVyIG9mIHNvdW5kcyBjYWNoZWQgaW4gbWVtb3J5XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFNvdW5kTWFuYWdlcigpIHtcclxuXHR0aGlzLnRlc3RTdXBwb3J0KCk7XHJcblx0XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2J1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcImV4aXRfd2Fsa1wiKTtcclxuXHRcclxuXHR0aGlzLnJlZ2lzdGVyUHJlbG9hZGVkTXVzaWMoXCJtX3Rvcm53b3JsZFwiLCB7XHJcblx0XHR0YWc6IERPUklUT19NVVNJQyxcclxuXHRcdGxvb3BTdGFydDogMTMuMzA0LFxyXG5cdFx0bG9vcEVuZDogMjIuODQyLFxyXG5cdH0pO1xyXG59XHJcbmluaGVyaXRzKFNvdW5kTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKFNvdW5kTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRzb3VuZHMgOiB7fSxcclxuXHRtdXNpYzoge30sXHJcblx0ZXh0IDogbnVsbCxcclxuXHRjcmVhdGVBdWRpbzogbnVsbCxcclxuXHRcclxuXHRfX211dGVkX211c2ljOiBmYWxzZSxcclxuXHRfX211dGVkX3NvdW5kOiBmYWxzZSxcclxuXHRfX3ZvbF9tdXNpYzogMC41LFxyXG5cdF9fdm9sX3NvdW5kOiAwLjUsXHJcblx0XHJcblx0dGVzdFN1cHBvcnQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0ZXN0c291bmQgPSBuZXcgQXVkaW8oKTtcclxuXHRcdHZhciBvZ2cgPSB0ZXN0c291bmQuY2FuUGxheVR5cGUoXCJhdWRpby9vZ2c7IGNvZGVjcz12b3JiaXNcIik7XHJcblx0XHRpZiAob2dnKSB0aGlzLmV4dCA9IFwiLm9nZ1wiO1xyXG5cdFx0ZWxzZSB0aGlzLmV4dCA9IFwiLm1wM1wiO1xyXG5cdFx0XHJcblx0XHR0cnkge1xyXG5cdFx0XHRhdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcclxuXHRcdFx0aWYgKGF1ZGlvQ29udGV4dCkge1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlQXVkaW8gPSBjcmVhdGVBdWRpb19XZWJBUEk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVBdWRpbyA9IGNyZWF0ZUF1ZGlvX1RhZztcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZUF1ZGlvID0gY3JlYXRlQXVkaW9fVGFnO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBMb2FkaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdC8qKiBMb2FkcyBzb3VuZCBmcm9tIHRoZSBzZXJ2ZXIsIHVzZWQgYXMgcGFydCBvZiB0aGUgc3RhcnR1cCBwcm9jZXNzLiAqL1xyXG5cdHByZWxvYWRTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCB7XHJcblx0XHRcdFx0dXJsIDogQkFTRVVSTCtcIi9zbmQvXCIgKyBpZCArIHRoaXMuZXh0LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5zb3VuZHNbaWRdLm11c3RLZWVwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLnNvdW5kc1tpZF07XHJcblx0fSxcclxuXHRcclxuXHQvKiogTG9hZHMgbXVzaWMgZnJvbSB0aGUgc2VydmVyLCB1c2VkIGFzIHBhcnQgb2YgdGhlIHN0YXJ0dXAgcHJvY2Vzcy4gKi9cclxuXHRyZWdpc3RlclByZWxvYWRlZE11c2ljOiBmdW5jdGlvbihpZCwgaW5mbykge1xyXG5cdFx0aWYgKCF0aGlzLm11c2ljW2lkXSkge1xyXG5cdFx0XHR0aGlzLm11c2ljW2lkXSA9IGNyZWF0ZUF1ZGlvX1RhZyhpZCwgaW5mbyk7IC8vZm9yY2UgdXNpbmcgdGhpcyBraW5kXHJcblx0XHRcdHRoaXMubXVzaWNbaWRdLm11c3RLZWVwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm11c2ljW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBMb2FkcyBzb3VuZCBmcm9tIGRhdGEgZXh0cmFjdGVkIGZyb20gdGhlIG1hcCB6aXAgZmlsZS4gKi9cclxuXHRsb2FkU291bmQ6IGZ1bmN0aW9uKGlkLCBpbmZvKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCBpbmZvKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLnNvdW5kc1tpZF07XHJcblx0fSxcclxuXHRcclxuXHQvKiogTG9hZHMgbXVzaWMgZnJvbSBkYXRhIGV4dHJhY3RlZCBmcm9tIHRoZSBtYXAgemlwIGZpbGUuICovXHJcblx0bG9hZE11c2ljOiBmdW5jdGlvbihpZCwgaW5mbykge1xyXG5cdFx0aWYgKCF0aGlzLm11c2ljW2lkXSkge1xyXG5cdFx0XHR0aGlzLl9lbnN1cmVSb29tRm9yTXVzaWMoKTtcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCBpbmZvKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm11c2ljW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdGlzTXVzaWNMb2FkZWQ6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRyZXR1cm4gISF0aGlzLm11c2ljW2lkXTtcclxuXHR9LFxyXG5cdGlzU291bmRMb2FkZWQ6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRyZXR1cm4gISF0aGlzLnNvdW5kc1tpZF07XHJcblx0fSxcclxuXHRcclxuXHRfZW5zdXJlUm9vbUZvck11c2ljOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmIChPYmplY3Qua2V5cyh0aGlzLm11c2ljKS5sZW5ndGgrMSA8PSBNQVhfTVVTSUMpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0dmFyIG9sZGVzdERhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHRcdHZhciBvbGRlc3RJZCA9IG51bGw7XHJcblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdHZhciBtID0gdGhpcy5tdXNpY1tpZF1cclxuXHRcdFx0aWYgKG0ubXVzdEtlZXApIGNvbnRpbnVlO1xyXG5cdFx0XHRpZiAobS5sb2FkRGF0ZSA8IG9sZGVzdERhdGUpIHtcclxuXHRcdFx0XHRvbGRlc3REYXRlID0gbS5sb2FkRGF0ZTtcclxuXHRcdFx0XHRvbGRlc3RJZCA9IGlkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMubXVzaWNbb2xkZXN0SWRdLnVubG9hZCgpO1xyXG5cdFx0ZGVsZXRlIHRoaXMubXVzaWNbb2xkZXN0SWRdO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQbGF5aW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRwbGF5U291bmQgOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0aWYgKHRoaXMubXV0ZWRfc291bmQpIHJldHVybjtcclxuXHRcdGlmICghdGhpcy5zb3VuZHNbaWRdKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJTb3VuZCBpcyBub3QgbG9hZGVkIVwiLCBpZCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuc291bmRzW2lkXS5wbGF5KCk7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5TXVzaWM6IGZ1bmN0aW9uKGlkKXtcclxuXHRcdHZhciBtID0gdGhpcy5tdXNpY1tpZF07XHJcblx0XHRpZiAoIW0pIHJldHVybjtcclxuXHRcdGlmIChtLnBsYXlpbmcpIHJldHVybjsgLy9hbHJlYWR5IHBsYXlpbmdcclxuXHRcdFxyXG5cdFx0dmFyIHN0YXJ0RGVsYXkgPSAwO1xyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHRpZiAodGhpcy5tdXNpY1tpZF0ucGxheWluZykge1xyXG5cdFx0XHRcdHRoaXMuc3RvcE11c2ljKGlkKTtcclxuXHRcdFx0XHRzdGFydERlbGF5ID0gMTAwMDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdG0ucGxheWluZyA9IHRydWU7XHJcblx0XHRcdGlmICh0aGlzLm11dGVkX211c2ljKSByZXR1cm47XHJcblx0XHRcdG0ucGxheWluZ19yZWFsID0gdHJ1ZTtcclxuXHRcdFx0bS5wbGF5KCk7XHJcblx0XHR9LCBzdGFydERlbGF5KTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhdXNlTXVzaWM6IGZ1bmN0aW9uKGlkKXtcclxuXHRcdHZhciBtID0gdGhpcy5tdXNpY1tpZF07XHJcblx0XHRpZiAoIW0pIHJldHVybjtcclxuXHRcdG0ucGxheWluZyA9IG0ucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRtLnBhdXNlKCk7XHJcblx0fSxcclxuXHRcclxuXHR0b2dnbGVNdXNpYzogZnVuY3Rpb24oaWQpIHtcclxuXHRcdHZhciBtID0gdGhpcy5tdXNpY1tpZF07XHJcblx0XHRpZiAoIW0pIHJldHVybjtcclxuXHRcdGlmIChtLnBsYXlpbmcpIHtcclxuXHRcdFx0bS5wbGF5aW5nID0gbS5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdFx0bS5wYXVzZSgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bS5wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFx0aWYgKHRoaXMubXV0ZWRfbXVzaWMpIHJldHVybjtcclxuXHRcdFx0bS5wbGF5aW5nX3JlYWwgPSB0cnVlO1xyXG5cdFx0XHRtLnBsYXkoKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BNdXNpYzogZnVuY3Rpb24oaWQpe1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0Ly8gbS5wbGF5aW5nID0gbS5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdC8vbS5wYXVzZSgpO1xyXG5cdFx0Ly9tLmN1cnJlbnRUaW1lID0gMDtcclxuXHRcdG0uZmFkZW91dCA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRfdGljazogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0ubG9vcFRpY2soZGVsdGEpO1xyXG5cdFx0fVxyXG5cdH0sXHJcbn0pO1xyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU291bmRNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdHZvbF9tdXNpYzoge1xyXG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9fdm9sX211c2ljOyB9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX3ZvbF9tdXNpYyA9IE1hdGguY2xhbXAodm9sKTtcclxuXHRcdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHRcdHRoaXMubXVzaWNbaWRdLnNldFZvbHVtZSh0aGlzLl9fdm9sX211c2ljKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdHZvbF9zb3VuZDoge1xyXG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9fdm9sX3NvdW5kOyB9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX3ZvbF9zb3VuZCA9IE1hdGguY2xhbXAodm9sKTtcclxuXHRcdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5zb3VuZHMpIHtcclxuXHRcdFx0XHR0aGlzLnNvdW5kc1tpZF0uc2V0Vm9sdW1lKHRoaXMuX192b2xfc291bmQpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0bXV0ZWRfbXVzaWM6IHtcclxuXHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fX211dGVkX211c2ljOyB9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0dGhpcy5fX211dGVkX211c2ljID0gdmFsO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdFx0dGhpcy5tdXNpY1tpZF0uc2V0TXV0ZWQodmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdG11dGVkX3NvdW5kOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX19tdXRlZF9zb3VuZDsgfSxcclxuXHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdHRoaXMuX19tdXRlZF9zb3VuZCA9IHZhbDtcclxuXHRcdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5zb3VuZHMpIHtcclxuXHRcdFx0XHR0aGlzLnNvdW5kc1tpZF0uc2V0TXV0ZWQodmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdFxyXG5cdF9fdm9sX211c2ljOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxuXHRfX3ZvbF9zb3VuZDogeyBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIH0sXHJcblx0X19tdXRlZF9tdXNpYzogeyBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIH0sXHJcblx0X19tdXRlZF9zb3VuZDogeyBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIH0sXHJcbn0pO1xyXG5cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFNvdW5kIE9iamVjdHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gU291bmRPYmplY3Qob3B0cykge1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHR0aGlzLmxvYWREYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbn1cclxuZXh0ZW5kKFNvdW5kT2JqZWN0LnByb3RvdHlwZSwge1xyXG5cdHBsYXlpbmc6IGZhbHNlLCAvL3NvdW5kIGlzIHBsYXlpbmcsIHRoZW9yZXRpY2FsbHkgKG1pZ2h0IGJlIG11dGVkKVxyXG5cdHBsYXlpbmdfcmVhbDogZmFsc2UsIC8vc291bmQgaXMgYWN0dWFsbHkgcGxheWluZyBhbmQgbm90IG11dGVkXHJcblx0XHJcblx0bG9vcFN0YXJ0OiAwLFxyXG5cdGxvb3BFbmQ6IDAsXHJcblx0XHJcblx0bG9hZERhdGU6IDAsIC8vbWlsaXNlY29uZCBkYXRlc3RhbXAgb2Ygd2hlbiB0aGlzIHdhcyBsb2FkZWQsIGZvciBjYWNoZSBjb250cm9sXHJcblx0bXVzdEtlZXA6IGZhbHNlLCAvL2lmIHdlIHNob3VsZCBza2lwIHRoaXMgb2JqZWN0IHdoZW4gZGV0ZXJtaW5pbmcgc291bmRzIHRvIHVubG9hZFxyXG5cdFxyXG5cdGZhZGVvdXQ6IGZhbHNlLFxyXG5cdFxyXG5cdHBsYXk6IGZ1bmN0aW9uKCl7fSxcclxuXHRwYXVzZTogZnVuY3Rpb24oKXt9LFxyXG5cdHNldFZvbHVtZTogZnVuY3Rpb24odm9sKXt9LFxyXG5cdHNldE11dGVkOiBmdW5jdGlvbihtdXRlZCl7fSxcclxuXHRsb29wVGljazogZnVuY3Rpb24oZGVsdGEpe30sXHJcblx0XHJcblx0dW5sb2FkOiBmdW5jdGlvbigpe30sXHJcbn0pO1xyXG5cclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEF1ZGlvIFRhZyBJbXBsZW1lbnRhdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVBdWRpb19UYWcoaWQsIGluZm8pIHtcclxuXHR2YXIgc25kO1xyXG5cdGlmIChpbmZvLnRhZykge1xyXG5cdFx0c25kID0gaW5mby50YWc7XHJcblx0fSBlbHNlIGlmIChpbmZvLnVybCkge1xyXG5cdFx0c25kID0gbmV3IEF1ZGlvKCk7XHJcblx0XHRzbmQuYXV0b3BsYXkgPSBmYWxzZTtcclxuXHRcdHNuZC5hdXRvYnVmZmVyID0gdHJ1ZTtcclxuXHRcdHNuZC5wcmVsb2FkID0gXCJhdXRvXCI7XHJcblx0XHRzbmQuc3JjID0gaW5mby51cmw7IFxyXG5cdFx0JChcImJvZHlcIikuYXBwZW5kKCAkKHNuZC50YWcpLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pICk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBjcmVhdGVBdWRpbyB3aXRob3V0IGFueSBpbmZvIVwiKTtcclxuXHR9XHJcblx0XHJcblx0dmFyIHNvYmogPSBuZXcgU291bmRPYmplY3Qoe1xyXG5cdFx0X190YWc6IHNuZCxcclxuXHRcdF9fYmxvYnVybDogaW5mby51cmwsXHJcblx0XHRcclxuXHRcdGxvb3BTdGFydDogaW5mby5sb29wU3RhcnQgfHwgMCxcclxuXHRcdGxvb3BFbmQ6IGluZm8ubG9vcEVuZCB8fCAwLFxyXG5cdFx0XHJcblx0XHRwbGF5OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhpcy5fX3RhZy5wbGF5KCk7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRwYXVzZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoaXMuX190YWcucGF1c2UoKTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHNldFZvbHVtZTogZnVuY3Rpb24odm9sKSB7XHJcblx0XHRcdHRoaXMuX190YWcudm9sdW1lID0gdm9sO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0TXV0ZWQ6IGZ1bmN0aW9uKG11dGVkKSB7XHJcblx0XHRcdGlmIChtdXRlZCkge1xyXG5cdFx0XHRcdHRoaXMucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5fX3RhZy5wYXVzZSgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICh0aGlzLnBsYXlpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMucGxheWluZ19yZWFsID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMuX190YWcucGxheSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0bG9vcFRpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGlmICghdGhpcy5sb29wRW5kIHx8ICF0aGlzLnBsYXlpbmdfcmVhbCkgcmV0dXJuO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRoaXMuX190YWcuY3VycmVudFRpbWUgPj0gdGhpcy5sb29wRW5kKSB7XHJcblx0XHRcdFx0dGhpcy5fX3RhZy5jdXJyZW50VGltZSAtPSAodGhpcy5sb29wRW5kIC0gdGhpcy5sb29wU3RhcnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0dW5sb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoaXMuX19ibG9idXJsKVxyXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5fX2Jsb2J1cmwpO1xyXG5cdFx0XHRcclxuXHRcdFx0JCh0aGlzLnRhZykucmVtb3ZlKCk7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLnRhZztcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0c25kLm9uKFwiZW5kZWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0c29iai5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdHNuZC5jdXJyZW50VGltZSA9IDA7XHJcblx0fSk7XHJcblx0XHJcblx0c25kLmxvYWQoKTtcclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gV2ViIEF1ZGlvIEFQSSBJbXBsZW1lbnRhdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlQXVkaW9fV2ViQVBJKGlkLCBpbmZvKSB7XHJcblx0dmFyIHNvYmogPSBuZXcgU291bmRPYmplY3Qoe1xyXG5cdFx0X19hdWRpb0J1ZmZlcjogbnVsbCxcclxuXHRcdF9fdGFnOiBudWxsLFxyXG5cdFx0X19nYWluQ3RybDogbnVsbCxcclxuXHRcdF9fbXV0ZUN0cmw6IG51bGwsXHJcblx0XHRfX2Jsb2J1cmw6IG51bGwsXHJcblx0XHRcclxuXHRcdF9fY3VyclNyYzogbnVsbCxcclxuXHRcdFxyXG5cdFx0bG9vcFN0YXJ0OiBpbmZvLmxvb3BTdGFydCB8fCAwLFxyXG5cdFx0bG9vcEVuZDogaW5mby5sb29wRW5kIHx8IDAsXHJcblx0XHRcclxuXHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgc3JjO1xyXG5cdFx0XHRpZiAodGhpcy5fX2F1ZGlvQnVmZmVyKSB7XHJcblx0XHRcdFx0c3JjID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0XHRcdHNyYy5idWZmZXIgPSB0aGlzLl9fYXVkaW9CdWZmZXI7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5fX3RhZykge1xyXG5cdFx0XHRcdHNyYyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoaW5mby50YWcpO1xyXG5cdFx0XHR9IGVsc2UgeyBcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIk5vIGF1ZGlvIGJ1ZmZlciByZWFkeSB0byBwbGF5IVwiKTsgXHJcblx0XHRcdFx0cmV0dXJuOyBcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c3JjLmxvb3AgPSAhIWluZm8ubG9vcEVuZDtcclxuXHRcdFx0aWYgKCEhaW5mby5sb29wRW5kKSB7XHJcblx0XHRcdFx0c3JjLmxvb3BTdGFydCA9IGluZm8ubG9vcFN0YXJ0O1xyXG5cdFx0XHRcdHNyYy5sb29wRW5kID0gaW5mby5sb29wRW5kO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzcmMub24oXCJlbmRlZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHNvYmoucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0c29iai5fX2N1cnJTcmMgPSBudWxsO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHNyYy5jb25uZWN0KHRoaXMuX19nYWluQ3RybCk7XHJcblx0XHRcdHNyYy5zdGFydCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5fX2N1cnJTcmMgPSBzcmM7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRwYXVzZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjLnN0b3AoKTtcclxuXHRcdFx0dGhpcy5fX2N1cnJTcmMgPSBudWxsO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX2dhaW5DdHJsLmdhaW4udmFsdWUgPSB2b2w7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRzZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcclxuXHRcdFx0aWYgKHRoaXMuZmFkZW91dCkgcmV0dXJuOyAvL2lnbm9yZSBkdXJpbmcgZmFkZW91dFxyXG5cdFx0XHR0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSA9IChtdXRlZCk/IDAgOiAxO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0bG9vcFRpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGlmICh0aGlzLmZhZGVvdXQpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgPiAwLjAwMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgLT0gZGVsdGEgKiAwLjA1O1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2codGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYy5zdG9wKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYyA9IG51bGw7XHJcblx0XHRcdFx0XHR0aGlzLmZhZGVvdXQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMucGxheWluZyA9IHRoaXMucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0XHR0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSA9IDE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHR1bmxvYWQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGlmICh0aGlzLl9fYmxvYnVybClcclxuXHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX19ibG9idXJsKTtcclxuXHRcdFx0XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fYmxvYnVybDtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19hdWRpb0J1ZmZlcjtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX190YWc7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fZ2FpbkN0cmw7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fbXV0ZUN0cmw7XHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cdFxyXG5cdFxyXG5cdGlmIChpbmZvLnRhZykge1xyXG5cdFx0c29iai5fX3RhZyA9IGluZm8udGFnO1xyXG5cdFx0XHJcblx0fSBlbHNlIGlmIChpbmZvLmRhdGEpIHtcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJEZWNvZGVBdWRpb19cIitpZCk7XHJcblx0XHRcclxuXHRcdHZhciBmciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRmci5vbihcImxvYWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0YXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShmci5yZXN1bHQsIGZ1bmN0aW9uKGJ1ZmZlcil7XHJcblx0XHRcdFx0c29iai5fX2F1ZGlvQnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0XHRcdGlmIChzb2JqLnBsYXlpbmdfcmVhbCkge1xyXG5cdFx0XHRcdFx0c29iai5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkRlY29kZUF1ZGlvX1wiK2lkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdGZyLnJlYWRBc0FycmF5QnVmZmVyKGluZm8uZGF0YSk7XHJcblx0XHRcclxuXHR9IGVsc2UgaWYgKGluZm8udXJsKSB7XHJcblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBpbmZvLnVybCk7XHJcblx0XHR4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyAhPSAyMDApIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTzpcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRhdGEgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdGF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpe1xyXG5cdFx0XHRcdHNvYmouX19hdWRpb0J1ZmZlciA9IGJ1ZmZlcjtcclxuXHRcdFx0XHRpZiAoc29iai5wbGF5aW5nX3JlYWwpIHtcclxuXHRcdFx0XHRcdHNvYmoucGxheSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTyEhXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGlmIChpbmZvLnVybC5pbmRleE9mKFwiYmxvYlwiKSA+IC0xKSB7XHJcblx0XHRcdHRoaXMuX19ibG9idXJsID0gaW5mby51cmw7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBjcmVhdGVBdWRpbyB3aXRob3V0IGFueSBpbmZvIVwiKTtcclxuXHR9XHJcblx0XHJcblx0c29iai5fX2dhaW5DdHJsID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHRcclxuXHQvL1RPRE8gbG9vayBpbnRvIDNkIHNvdW5kIGZ1bjogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0F1ZGlvQ29udGV4dC5jcmVhdGVQYW5uZXJcclxuXHRcclxuXHRzb2JqLl9fbXV0ZUN0cmwgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFxyXG5cdFxyXG5cdHNvYmouX19nYWluQ3RybC5jb25uZWN0KHNvYmouX19tdXRlQ3RybCk7XHJcblx0Ly9UT0RPXHJcblx0c29iai5fX211dGVDdHJsLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTb3VuZE1hbmFnZXIoKTtcclxuIiwiLy8gdWktbWFuYWdlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBVSSBtb2R1bGUsIHdoaWNoIGNvbnRyb2xzIHRoZSB1c2VyIGludGVyZmFjZS5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG52YXIgQnViYmxlU3ByaXRlID0gcmVxdWlyZShcInRwcC1zcHJpdGVtb2RlbFwiKS5CdWJibGVTcHJpdGU7XHJcblxyXG52YXIgTV9XSURUSCA9IDAsIE1fSEVJR0hUID0gMSwgTV9ISURFID0gMiwgTV9UUklBTkdMRSA9IDMsIE1fVEFJTFggPSA0LCBNX1RBSUxZID0gNTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gVUlNYW5hZ2VyKCkge1xyXG5cdHRoaXMuZGlhbG9ncyA9IHtcclxuXHRcdFwidGV4dFwiIDogbmV3IERpYWxvZ0JveChcInRleHRib3hfZ29sZFwiKSxcclxuXHRcdFwiZGlhbG9nXCIgOiBuZXcgRGlhbG9nQm94KFwiZGlhbG9nX2J1YmJsZVwiKSxcclxuXHR9O1xyXG5cdHRoaXMuc2tyaW0gPSBuZXcgU2tyaW0oKTtcclxuXHR0aGlzLmxvYWRlciA9IG5ldyBBamF4TG9hZGVyKCk7XHJcblx0XHJcblx0dGhpcy5idWJibGVQb29sID0gW107XHJcblx0dGhpcy5hbGxCdWJibGVzID0gW107XHJcblx0XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdCQoZnVuY3Rpb24oKXtcclxuXHRcdHNlbGYuX2luaXRVSVNjZW5lKCk7XHJcblx0XHRcclxuXHRcdCQoXCIjcHJlbG9hZFNjcmVlblwiKS5mYWRlT3V0KDgwMCwgZnVuY3Rpb24oKXtcclxuXHRcdFx0JCh0aGlzKS5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciB0eXBlIGluIHNlbGYuZGlhbG9ncykge1xyXG5cdFx0XHRzZWxmLmRpYWxvZ3NbdHlwZV0uZWxlbWVudCA9ICQoXCI8ZGl2PlwiKVxyXG5cdFx0XHRcdC5hZGRDbGFzcyhcImRpYWxvZ2JveFwiKS5hZGRDbGFzcyh0eXBlKVxyXG5cdFx0XHRcdC5hcHBlbmRUbyhcIiNjYW52YXMtdWlcIik7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuaW5oZXJpdHMoVUlNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoVUlNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdGxvYWRlcjogbnVsbCxcclxuXHRza3JpbSA6IG51bGwsXHJcblx0ZGlhbG9ncyA6IG51bGwsXHJcblx0XHJcblx0YnViYmxlUG9vbDogbnVsbCxcclxuXHRhbGxCdWJibGVzOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFVJIEFjdGlvbnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0LyoqIFNob3cgYSBzdGFuZGFyZCB0ZXh0Ym94IG9uIHNjcmVlbi4gKi9cclxuXHRzaG93VGV4dEJveCA6IGZ1bmN0aW9uKHR5cGUsIGh0bWwsIG9wdHMpIHtcclxuXHRcdGlmICgkLmlzUGxhaW5PYmplY3QoaHRtbCkgJiYgb3B0cyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdG9wdHMgPSBodG1sOyBodG1sID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0b3B0cyA9IGV4dGVuZChvcHRzLCB7XHJcblx0XHRcdGh0bWw6IGh0bWwsXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0dmFyIGQgPSB0aGlzLmRpYWxvZ3NbdHlwZV07XHJcblx0XHRpZiAoIWQpIHtcclxuXHRcdFx0ZCA9IHRoaXMuZGlhbG9nc1tcInRleHRcIl07XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbnZhbGlkIGRpYWxvZyB0eXBlOiBcIit0eXBlKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZC5zaG93KG9wdHMpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEltbWVkZWF0ZWx5IGhpZGVzIHRoZSB0ZXh0IGJveCBhbmQgY2xlYXJzIGFueSB0ZXh0IHRoYXQgd2FzIGluIGl0LiAqL1xyXG5cdGNsb3NlVGV4dEJveCA6IGZ1bmN0aW9uKHR5cGUpIHtcclxuXHRcdHZhciBkID0gdGhpcy5kaWFsb2dzW3R5cGVdO1xyXG5cdFx0aWYgKCFkKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGRpYWxvZyB0eXBlOiBcIit0eXBlKTtcclxuXHRcdFxyXG5cdFx0ZC5oaWRlKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogU2hvd3MgYSBzZWxlY3RhYmxlIG1lbnUgaW4gdGhlIHRvcC1yaWdodCBjb3JuZXIgb2YgdGhlIHNjcmVlbi4gKi9cclxuXHRzaG93TWVudSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogSW1tZWRhdGVseSBjbG9zZXMgdGhlIG1lbnUgYW5kIGNsZWFycyBpdCBmb3IgZnVydGhlciB1c2UuICovXHJcblx0Y2xvc2VNZW51IDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBcclxuXHQgKiBTaG93cyBhIFllcy9ObyBtZW51IGp1c3QgYWJvdmUgdGhlIHRleHQgYm94LiBJZiB0ZXh0IGlzIGN1cnJlbnRseSBwcmludGluZyBvdXQgb24gYSwgXHJcblx0ICogZGlhbG9nIGJveCBvciB0ZXh0IGJveCBvbiBzY3JlZW4sIHRoaXMgd2lsbCBhdXRvbWF0aWNhbGx5IHdhaXQgZm9yIHRoZSB0ZXh0IHRvIGZpbmlzaFxyXG5cdCAqIHByaW50aW5nIGJlZm9yZSBzaG93aW5nIGl0LiBUaGUgWWVzIGFuZCBObyBmdW5jdGlvbnMgd2lsbCBmaXJlIG9mZiBvbmUgd2hlbiBpcyBzZWxlY3RlZC5cclxuXHQgKiBUaGUgZnVuY3Rpb25zIHdpbGwgcHJlc3VtYWJseSBwdXNoIG1vcmUgYWN0aW9ucyBpbnRvIHRoZSBhY3Rpb24gcXVldWUuXHJcblx0ICovXHJcblx0c2hvd0NvbmZpcm1Qcm9tcHQgOiBmdW5jdGlvbih5ZXNmbiwgbm9mbikge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRvcGVuSW5mb2RleFBhZ2UgOiBmdW5jdGlvbihwYWdlaWQpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Z2V0RW1vdGVCdWJibGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBlbW90ZSA9IHRoaXMuYnViYmxlUG9vbC51bnNoaWZ0KCk7XHJcblx0XHRpZiAoIWVtb3RlKSB7XHJcblx0XHRcdGVtb3RlID0gbmV3IEJ1YmJsZVNwcml0ZSgpO1xyXG5cdFx0XHRlbW90ZS5yZWxlYXNlID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRzZWxmLnBhcmVudC5yZW1vdmUoc2VsZik7XHJcblx0XHRcdFx0c2VsZi5idWJibGVQb29sLnB1c2goZW1vdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHR0aGlzLmFsbEJ1YmJsZXMucHVzaChlbW90ZSk7XHJcblx0XHR9XHJcblx0XHQvLyBlbW90ZS5zZXRUeXBlKHR5cGUpO1xyXG5cdFx0cmV0dXJuIGVtb3RlO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiB0byB3aGl0ZSBmb3IgYSB0cmFuc2l0aW9uIG9mIHNvbWUgc29ydC4gKi9cclxuXHRmYWRlVG9XaGl0ZSA6IGZ1bmN0aW9uKHNwZWVkLCBjYWxsYmFjaykge1xyXG5cdFx0aWYgKHR5cGVvZiBzcGVlZCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0Y2FsbGJhY2sgPSBzcGVlZDsgc3BlZWQgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAoIXNwZWVkKSBzcGVlZCA9IDE7IC8vMSBzZWNvbmRcclxuXHRcdFxyXG5cdFx0dGhpcy5za3JpbS5mYWRlVG8oe1xyXG5cdFx0XHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHRcdG9wYWNpdHk6IDEsXHJcblx0XHRcdHNwZWVkOiBzcGVlZCxcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuXHRcdC8vIHRoaXMuc2tyaW0uZmFkZUluKHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBGYWRlIHRoZSBzY3JlZW4gdG8gYmxhY2sgZm9yIGEgdHJhbnNpdGlvbiBvZiBzb21lIHNvcnQuICovXHJcblx0ZmFkZVRvQmxhY2sgOiBmdW5jdGlvbihzcGVlZCwgY2FsbGJhY2spIHtcclxuXHRcdGlmICh0eXBlb2Ygc3BlZWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGNhbGxiYWNrID0gc3BlZWQ7IHNwZWVkID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFzcGVlZCkgc3BlZWQgPSAxOyAvLzEgc2Vjb25kXHJcblx0XHRcclxuXHRcdHRoaXMuc2tyaW0uZmFkZVRvKHtcclxuXHRcdFx0Y29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0XHRvcGFjaXR5OiAxLFxyXG5cdFx0XHRzcGVlZDogc3BlZWQsXHJcblx0XHR9LCBjYWxsYmFjayk7XHJcblx0XHQvLyB0aGlzLnNrcmltLmZhZGVJbihzcGVlZCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogRmFkZSB0aGUgc2NyZWVuIG91dCBmb3IgYSB0cmFuc2l0aW9uIG9mIHNvbWUgc29ydC4gKi9cclxuXHRmYWRlT3V0IDogZnVuY3Rpb24oc3BlZWQsIGNhbGxiYWNrKSB7XHJcblx0XHRpZiAodHlwZW9mIHNwZWVkID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRjYWxsYmFjayA9IHNwZWVkOyBzcGVlZCA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmICghc3BlZWQpIHNwZWVkID0gMTsgLy8xIHNlY29uZFxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmZhZGVUbyh7XHJcblx0XHRcdG9wYWNpdHk6IDEsXHJcblx0XHRcdHNwZWVkOiBzcGVlZCxcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuXHRcdC8vIHRoaXMuc2tyaW0uZmFkZUluKHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBGYWRlIHRoZSBzY3JlZW4gaW4gZnJvbSBhIHRyYW5zaXRpb24uICovXHJcblx0ZmFkZUluIDogZnVuY3Rpb24oc3BlZWQsIGNhbGxiYWNrKSB7XHJcblx0XHRpZiAodHlwZW9mIHNwZWVkID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRjYWxsYmFjayA9IHNwZWVkOyBzcGVlZCA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmICghc3BlZWQpIHNwZWVkID0gMTsgLy8xIHNlY29uZFxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmZhZGVUbyh7XHJcblx0XHRcdG9wYWNpdHk6IDAsXHJcblx0XHRcdHNwZWVkOiBzcGVlZCxcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuXHRcdC8vIHRoaXMuc2tyaW0uZmFkZU91dChzcGVlZCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogRGlzcGxheXMgdGhlIGxvYWRpbmcgaWNvbiBvdmVyIHRoZSBtYWluIGdhbWUgc2NyZWVuLiBPcHRpb25hbGx5IHN1cHBseSB0ZXh0LiAqL1xyXG5cdHNob3dMb2FkaW5nQWpheCA6IGZ1bmN0aW9uKGxvYWRpbmdUZXh0KSB7XHJcblx0XHRpZiAoIWxvYWRpbmdUZXh0KSBsb2FkaW5nVGV4dCA9IFwiTG9hZGluZy4uLlwiO1xyXG5cdFx0dGhpcy5sb2FkZXIuc2hvdygpO1xyXG5cdH0sXHJcblx0XHJcblx0aGlkZUxvYWRpbmdBamF4IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmxvYWRlci5oaWRlKCk7XHJcblx0fSxcclxuXHRcclxuXHR1cGRhdGVMb2FkaW5nUHJvZ3Jlc3M6IGZ1bmN0aW9uKHByb2dyZXNzLCB0b3RhbCkge1xyXG5cdFx0aWYgKHByb2dyZXNzICE9PSB1bmRlZmluZWQpIHRoaXMubG9hZGVyLnByb2dyZXNzID0gcHJvZ3Jlc3M7XHJcblx0XHRpZiAodG90YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5sb2FkZXIucHJvZ3Jlc3NfdG90YWwgPSB0b3RhbDtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQWN0aW9uIFF1ZXVlcyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Y3VyckFjdGlvbiA6IG51bGwsXHJcblx0YWN0aW9uUXVldWUgOiBbXSxcclxuXHRcclxuXHQvKiogUGFzcyB0aGlzIGEgc2V0IG9mIGZ1bmN0aW9ucyB0byBiZSBydW4gb25lIGFmdGVyIHRoZSBvdGhlciB3aGVuIHRoZSB1c2VyIGNvbmZpcm1zIFxyXG5cdCAqICBhbiBhY3Rpb24uICovXHJcblx0cXVldWVBY3Rpb25zOiBmdW5jdGlvbigpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBhcmcgPSBhcmd1bWVudHNbaV07XHJcblx0XHRcdGlmICgkLmlzQXJyYXkoYXJnKSkge1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYXJnLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRpZiAoISQuaXNGdW5jdGlvbihhcmdbal0pKSBcclxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVUkgQWN0aW9ucyBtdXN0IGJlIGZ1bmN0aW9ucyB0byBiZSBydW4hXCIpO1xyXG5cdFx0XHRcdFx0dGhpcy5hY3Rpb25RdWV1ZS5wdXNoKGFyZ1tqXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKCQuaXNGdW5jdGlvbihhcmdbal0pKSB7XHJcblx0XHRcdFx0dGhpcy5hY3Rpb25RdWV1ZS5wdXNoKGFyZ1tqXSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVUkgQWN0aW9ucyBtdXN0IGJlIGZ1bmN0aW9ucyB0byBiZSBydW4hXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHQvKiogQ2xlYXJzIGFsbCBxdWV1ZWQgYWN0aW9ucyBmcm9tIHRoZSB1aSBhY3Rpb24gcXVldWUuIFVzZSB0aGlzIHNwYXJpbmdseS4gVGhpcyB3aWxsIFxyXG5cdCAqICBOT1QgdGVybWluYXRlIGFueSBjdXJyZW50bHkgcnVubmluZyBhY3Rpb25zIG9yIGNsZWFyIGFueSB0ZXh0IGJveGVzLiAqL1xyXG5cdGNsZWFyQWN0aW9uUXVldWUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLyBVSSBUaHJlZS5qcyBTY2VuZSAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0c2NlbmUgOiBudWxsLFxyXG5cdGNhbWVyYSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRVSVNjZW5lIDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHRcdHRoaXMuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIHN3ID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0XHR2YXIgc2ggPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHRcclxuXHRcdHZhciBjYW1lcmEgPSB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEoMCwgc3csIHNoLCAwLCAxLCAxMDEpO1xyXG5cdFx0Y2FtZXJhLnBvc2l0aW9uLnNldCgwLCAwLCA1MSk7XHJcblx0XHR0aGlzLnNjZW5lLmFkZChjYW1lcmEpO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBkbG9nIGluIHRoaXMuZGlhbG9ncykge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcImNyZWF0ZU1vZGVsOiBcIiwgZGxvZywgdGhpcy5kaWFsb2dzW2Rsb2ddKTsgXHJcblx0XHRcdHZhciBtb2RlbCA9IHRoaXMuZGlhbG9nc1tkbG9nXS5jcmVhdGVNb2RlbCgpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChtb2RlbCk7XHJcblx0XHR9XHJcblx0XHR7XHJcblx0XHRcdHZhciBtb2RlbCA9IHRoaXMuc2tyaW0uY3JlYXRlTW9kZWwoKTtcclxuXHRcdFx0dGhpcy5zY2VuZS5hZGQobW9kZWwpO1xyXG5cdFx0fXtcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5sb2FkZXIuY3JlYXRlTW9kZWwoKTtcclxuXHRcdFx0dGhpcy5zY2VuZS5hZGQobW9kZWwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBjcmVhdGVERUJVR1NldHVwLmNhbGwodGhpcyk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRsb2dpY0xvb3AgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMuY3VyckFjdGlvbikge1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5hY3Rpb25RdWV1ZS5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gdGhpcy5hY3Rpb25RdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJ1aWFjdGlvblwiKTtcclxuXHRcdFx0dGhpcy5jdXJyQWN0aW9uKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvL0lmIHRoZSBhY3Rpb24gY29tcGxldGVkIHRoaXMgdHVybiwgYW5kIGRpZG4ndCBwdXNoIGl0cyBvd24gY29udGV4dFxyXG5cdFx0XHRpZiAoY29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJ1aWFjdGlvblwiKSA9PSBcInVpYWN0aW9uXCIpIHtcclxuXHRcdFx0XHQvL0NsZWFyIHRoZSBjdXJyZW50IGFjdGlvblxyXG5cdFx0XHRcdHRoaXMuY3VyckFjdGlvbiA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdH0gXHJcblx0XHRcclxuXHRcdGZvciAodmFyIGRsb2cgaW4gdGhpcy5kaWFsb2dzKSB7XHJcblx0XHRcdGlmICh0aGlzLmRpYWxvZ3NbZGxvZ10uYWR2YW5jZSkge1xyXG5cdFx0XHRcdGlmIChjb250cm9sbGVyLmlzRG93bk9uY2UoXCJJbnRlcmFjdFwiLCBcImRsb2dQcmludGluZ1wiKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5kaWFsb2dzW2Rsb2ddLmNvbXBsZXRlKCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChjb250cm9sbGVyLmlzRG93bk9uY2UoXCJJbnRlcmFjdFwiLCBcImRsb2dXYWl0aW5nXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmRpYWxvZ3NbZGxvZ10uX2Rpc3BsYXlOZXh0KCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuZGlhbG9nc1tkbG9nXS5hZHZhbmNlKGRlbHRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5za3JpbS5hZHZhbmNlKGRlbHRhKTtcclxuXHRcdHRoaXMubG9hZGVyLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYWxsQnViYmxlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAodGhpcy5hbGxCdWJibGVzW2ldLnZpc2libGUpIHtcclxuXHRcdFx0XHR0aGlzLmFsbEJ1YmJsZXNbaV0uX3RpY2soZGVsdGEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfY29tcGxldGVDdXJyQWN0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5hY3Rpb25RdWV1ZS5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gdGhpcy5hY3Rpb25RdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24oKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwidWlhY3Rpb25cIik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBEaWFsb2dCb3godHlwZSkge1xyXG5cdHRoaXMudHlwZSA9IHR5cGU7XHJcbn1cclxuZXh0ZW5kKERpYWxvZ0JveC5wcm90b3R5cGUsIHtcclxuXHRtb2RlbCA6IG51bGwsXHJcblx0ZWxlbWVudCA6IG51bGwsXHJcblx0b3duZXIgOiBudWxsLFxyXG5cdGh0bWwgOiBbXSxcclxuXHRcclxuXHRhZHZhbmNlIDogbnVsbCxcclxuXHRjb21wbGV0ZTogZnVuY3Rpb24oKXt9LFxyXG5cdF9jb21wbGV0aW9uQ2FsbGJhY2sgOiBudWxsLCAvL2NhbGxiYWNrIGZyb20gdGhlIGV2ZW50IHN0YXJ0aW5nIHRoaXMgZGlhbG9nLlxyXG5cdFxyXG5cdHNob3cgOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvLyBpZiAoIW9wdHMuaHRtbCkge1xyXG5cdFx0Ly8gXHR0aHJvdyBuZXcgRXJyb3IoXCJObyBIVE1MIGdpdmVuIHRvIHRoZSBkaWFsb2dib3gncyBzaG93KCkgbWV0aG9kIVwiKTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHRcdG93bmVyOiBudWxsLFxyXG5cdFx0XHRpc0xhc3QgOiBmYWxzZSxcclxuXHRcdH0sIG9wdHMpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm93bmVyID0gb3B0cy5vd25lcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5fY29tcGxldGlvbkNhbGxiYWNrID0gb3B0cy5jb21wbGV0ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHR5cGVvZiBvcHRzLmh0bWwgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR0aGlzLmh0bWwgPSBbb3B0cy5odG1sXTtcclxuXHRcdH0gZWxzZSBpZiAoJC5pc0FycmF5KG9wdHMuaHRtbCkpIHtcclxuXHRcdFx0dGhpcy5odG1sID0gb3B0cy5odG1sLnNsaWNlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRGlhbG9nIGdpdmVuIGlzIG9mIHRoZSB3cm9uZyB0eXBlISBcIiwgb3B0cy5odG1sKTtcclxuXHRcdFx0dGhpcy5odG1sID0gW1wiW0VSUk9SOiBUaGlzIGRpYWxvZyB0ZXh0IGNvdWxkIG5vdCBiZSBsb2FkZWQgcHJvcGVybHkhXVwiXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5fZGlzcGxheSgpO1xyXG5cdH0sXHJcblx0XHJcblx0aGlkZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLmVsZW1lbnQuaGlkZSgpLmNzcyh7IHdpZHRoOlwiXCIsIGhlaWdodDpcIlwiLCBib3R0b206XCJcIiwgbGVmdDpcIlwiLCB0b3A6XCJcIiwgcmlnaHQ6XCJcIiB9KTtcclxuXHRcdHRoaXMuaHRtbCA9IFtdO1xyXG5cdFx0dGhpcy5hZHZhbmNlID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuX2NvbXBsZXRpb25DYWxsYmFjaylcclxuXHRcdFx0dGhpcy5fY29tcGxldGlvbkNhbGxiYWNrLmNhbGwobnVsbCk7XHJcblx0fSxcclxuXHRcclxuXHRfZGlzcGxheTogZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBvcHRzID0gZXh0ZW5kKG9wdHMsIHtcclxuXHRcdC8vIFx0YW5jaG9yWTogXCJib3R0b21cIixcclxuXHRcdC8vIFx0YW5jaG9yWDogXCJsZWZ0XCIsXHJcblx0XHQvLyB9KTtcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAxOiBzaXplIG91dCB0aGUgdGV4dGJveCBzcGFjZVxyXG5cdFx0dmFyIGUgPSB0aGlzLmVsZW1lbnQ7XHJcblx0XHRlLmNzcyh7IHdpZHRoOlwiXCIsIGhlaWdodDpcIlwiLCBib3R0b206XCJcIiwgbGVmdDpcIlwiLCB0b3A6XCJcIiwgcmlnaHQ6XCJcIiB9KTsgLy9yZXNldFxyXG5cdFx0XHJcblx0XHRlLmNzcyh7IFwidmlzaWJpbGl0eVwiOiBcImhpZGRlblwiIH0pLnNob3coKTsgLy9Ob3RlOiAkLnNob3coKSBkb2VzIG5vdCBhZmZlY3QgXCJ2aXNpYmlsaXR5XCJcclxuXHRcdHZhciB3aWR0aCA9IDAsIGhlaWdodCA9IDA7XHJcblx0XHQvLyB2YXIgdywgaDtcclxuXHRcdFxyXG5cdFx0Ly9Gb3IgZWFjaCBkaWFsb2cgaW4gdGhlIHRleHQgdG8gZGlzcGxheSwgc2l6ZSBvdXQgdGhlIGJveCB0byBmaXQgdGhlIGxhcmdlc3Qgb25lXHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaHRtbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR2YXIgZiA9IHRoaXMuaHRtbFtpXTtcclxuXHRcdFx0aWYgKHR5cGVvZiBmICE9IFwic3RyaW5nXCIpIGNvbnRpbnVlO1xyXG5cdFx0XHRlLmh0bWwoZik7XHJcblx0XHRcdHdpZHRoID0gTWF0aC5tYXgoZS5pbm5lcldpZHRoKCksIHdpZHRoKTtcclxuXHRcdFx0aGVpZ2h0ID0gTWF0aC5tYXgoZS5pbm5lckhlaWdodCgpLCBoZWlnaHQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlmeCA9IGUuaW5uZXJXaWR0aCgpIC0gZS53aWR0aCgpO1xyXG5cdFx0dmFyIGRpZnkgPSBlLmlubmVySGVpZ2h0KCkgLSBlLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDI6IHJlc2l6ZSBhbmQgcG9zaXRpb24gdGhlIHRleHRib3hlc1xyXG5cdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9XSURUSF0gPSB3aWR0aDtcclxuXHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSEVJR0hUXSA9IGhlaWdodDtcclxuXHRcdGUuY3NzKHsgd2lkdGg6IHdpZHRoLWRpZngrMiwgaGVpZ2h0OiBoZWlnaHQtZGlmeSB9KTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIGJhc2Ugb24gYW5jaG9yIHBvaW50c1xyXG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMTAsIDEwLCAwKTtcclxuXHRcdGUuY3NzKHsgYm90dG9tOiAxMCwgbGVmdDogMTAsIHRvcDogXCJcIiB9KTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIG1vdmUgaW50byBhbiBcImFkdmFuY2VcIlxyXG5cdFx0aWYgKHRoaXMub3duZXIgJiYgdGhpcy5vd25lci5nZXRUYWxraW5nQW5jaG9yKSB7XHJcblx0XHRcdC8vVE9ETyBkZXRlcm1pbmUgYW5jaG9yIHBvaW50IGJhc2VkIG9uIHdoZXJlIHRoZSBvd25lciBpcyBvbi1zY3JlZW5cclxuXHRcdFx0Ly9Qcm9qZWN0IFZlY3RvciA9IDNEIHRvIDJELCBVbnByb2plY3QgVmVjdG9yID0gMkQgdG8gM0RcclxuXHRcdFx0dmFyIGFuY2hvciA9IHRoaXMub3duZXIuZ2V0VGFsa2luZ0FuY2hvcigpO1xyXG5cdFx0XHRhbmNob3IucHJvamVjdChjdXJyZW50TWFwLmNhbWVyYSk7XHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVEFJTFhdID0gYW5jaG9yLnggLSB0aGlzLm1vZGVsLnBvc2l0aW9uLng7XHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVEFJTFldID0gYW5jaG9yLnkgLSB0aGlzLm1vZGVsLnBvc2l0aW9uLnk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDM6IHNldHVwIHR5cGV3cml0ZXIgZWZmZWN0IGFuZCBzaG93IGRpYWxvZ2JveFxyXG5cdFx0dGhpcy5fZGlzcGxheU5leHQoKTtcclxuXHRcdFxyXG5cdFx0ZS5jc3MoeyBcInZpc2liaWxpdHlcIjogXCJcIiB9KTtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBEaWFsb2cgaXMgYWxyZWFkeSBzaG93aW5nIGFuZCBzaXplZCwgc2hvdyBuZXh0IGRpYWxvZywgb3IgY2xvc2UuICovXHJcblx0X2Rpc3BsYXlOZXh0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgdHh0O1xyXG5cdFx0d2hpbGUodGhpcy5odG1sICYmIHRoaXMuaHRtbC5sZW5ndGgpIHtcclxuXHRcdFx0dHh0ID0gdGhpcy5odG1sLnNoaWZ0KCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwic2hpZnQ6IFwiLCB0eHQpO1xyXG5cdFx0XHRpZiAodHlwZW9mIHR4dCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0dHh0ID0gdHh0LmNhbGwodGhpcy5vd25lcik7XHJcblx0XHRcdFx0fSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoXCJEaWFsb2cgZnVuY3Rpb24gdGhyZXcgYW4gZXJyb3IhXCIsIGUpOyB9XHJcblx0XHRcdFx0aWYgKCF0eHQpIGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5sb2coXCJicmVhazogXCIsIHR4dCk7XHJcblx0XHRcdFxyXG5cdFx0aWYgKHR4dCkge1xyXG5cdFx0XHRcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiZGxvZ1ByaW50aW5nXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc29sZS5sb2coXCJwdXNoOiBcIiwgdHh0KTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuZWxlbWVudC5odG1sKHR4dCk7IC8vcHV0IGluIGZpcnN0IGRpYWxvZ1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1RSSUFOR0xFXSA9ICh0aGlzLmh0bWwubGVuZ3RoKT8gMTogMDtcclxuXHRcdFx0XHJcblx0XHRcdHNldHVwVHlwZXdyaXRlcih0aGlzLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiZGxvZ1ByaW50aW5nXCIpO1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcImRsb2dXYWl0aW5nXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcImVuZDogXCIsIHR4dCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdHRoaXMuaGlkZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgaW5zOyAvL2luc2V0c1xyXG5cdFx0c3dpdGNoICh0aGlzLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImRpYWxvZ19idWJibGVcIjpcclxuXHRcdFx0XHRpbnMgPSB7IC8vcmVtZW1iZXIsIG1lYXN1cmVkIGZyb20gYm90dG9tIGxlZnQgY29ybmVyXHJcblx0XHRcdFx0XHR0OiA2LCBiOiAxMCwgaDogMTYsIC8vdG9wLCBib3R0b20sIGhlaWdodFxyXG5cdFx0XHRcdFx0bDogNiwgcjogMTAsIHc6IDE2LCAvL2xlZnQsIHJpZ2h0LCB3aWR0aFxyXG5cdFx0XHRcdFx0YXM6IDQsIGF4OiA2LCBheTogMTAsIC8vYXJyb3cgc2l6ZSwgeC95IHBvc2l0aW9uXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInRleHRib3hfZ29sZFwiOlxyXG5cdFx0XHRcdGlucyA9IHsgXHJcblx0XHRcdFx0XHR0OiA3LCBiOiAxMCwgaDogMTYsXHJcblx0XHRcdFx0XHRsOiA5LCByOiAxMiwgdzogMzIsXHJcblx0XHRcdFx0XHRhczogNCwgYXg6IDIyLCBheTogMTAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdHtcclxuXHRcdFx0Z2VvbS52ZXJ0aWNlcyA9IFtcclxuXHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XTtcclxuXHRcdFx0ZjQoZ2VvbSwgMCwgMSwgNCwgNSk7IGY0KGdlb20sIDEsIDIsIDUsIDYpOyBmNChnZW9tLCAyLCAzLCA2LCA3KTtcclxuXHRcdFx0ZjQoZ2VvbSwgNCwgNSwgOCwgOSk7IGY0KGdlb20sIDUsIDYsIDksMTApOyBmNChnZW9tLCA2LCA3LDEwLDExKTtcclxuXHRcdFx0ZjQoZ2VvbSwgOCwgOSwxMiwxMyk7IGY0KGdlb20sIDksMTAsMTMsMTQpOyBmNChnZW9tLDEwLDExLDE0LDE1KTtcclxuXHRcdFx0ZjQoZ2VvbSwxNiwxNywxOCwxOSwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Z2VvbS5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygyMiwgMjAsIDIxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgMCkpO1xyXG5cdFx0XHRcdC8vIGdlb20uZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMjIsIDIxLCAyMCkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGdlb20uZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgXSk7XHJcblx0XHRcdFx0Ly8gZ2VvbS5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Z2VvbS5tb3JwaFRhcmdldHMgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ3aWR0aFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yKzEsICAgICAwKSwgdjMoaW5zLncrMSwgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yKzEsIGlucy50KSwgdjMoaW5zLncrMSwgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yKzEsIGlucy5iKSwgdjMoaW5zLncrMSwgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMucisxLCBpbnMuaCksIHYzKGlucy53KzEsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcysxLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcysxLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzKzEsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzKzEsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwKzAuNSwgKGlucy5oKS8yLCAtMSksIHYzKDE2KzAuNSwgKGlucy5oKS8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiaGVpZ2h0XCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwICApLCB2MyhpbnMubCwgICAgIDAgICksIHYzKGlucy5yLCAgICAgMCAgKSwgdjMoaW5zLncsICAgICAwICApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCAgKSwgdjMoaW5zLmwsIGlucy50ICApLCB2MyhpbnMuciwgaW5zLnQgICksIHYzKGlucy53LCBpbnMudCAgKSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIrMSksIHYzKGlucy5sLCBpbnMuYisxKSwgdjMoaW5zLnIsIGlucy5iKzEpLCB2MyhpbnMudywgaW5zLmIrMSksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCsxKSwgdjMoaW5zLmwsIGlucy5oKzEpLCB2MyhpbnMuciwgaW5zLmgrMSksIHYzKGlucy53LCBpbnMuaCsxKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgKGlucy5oKzEpLzIsIC0xKSwgdjMoMTYsIChpbnMuaCsxKS8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiaGlkZVN0b3BcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywtMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsLTEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsLTEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLC0xKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRyaWFuZ2xlXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yLCBpbnMuYiksIHYzKGlucy53LCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXggICAgICAgLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4ICAgICAgICwgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oLzIsIC0xKSwgdjMoMTYsIGlucy5oLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ0YWlsWFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDEsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwidGFpbFlcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAxLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hGYWNlTWF0ZXJpYWwoW1xyXG5cdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0XHRcdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdFx0dGV4Lm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdFx0dGV4LmFuaXNvdHJvcHkgPSAxO1xyXG5cdFx0XHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdFx0ZnVuY3Rpb24gZigpe1xyXG5cdFx0XHRcdFx0dGV4LmltYWdlID0gaW1nO1xyXG5cdFx0XHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpbWcuc3JjID0gQkFTRVVSTCtcIi9pbWcvdWkvXCIrc2VsZi50eXBlK1wiLnBuZ1wiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG1hdC5tYXAgPSB0ZXg7XHJcblx0XHRcdFx0bWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcdFx0bWF0LnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXQuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHRcdFx0XHRyZXR1cm4gbWF0O1xyXG5cdFx0XHR9KSgpLFxyXG5cdFx0XHRcclxuXHRcdFx0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdFx0XHRjb2xvcjogMHgwMDAwMDAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0bWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcdFx0cmV0dXJuIG1hdDtcclxuXHRcdFx0fSkoKSxcclxuXHRcdF0pO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1vZGVsID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5tb2RlbC5yZW5kZXJEZXB0aCA9IDA7XHJcblx0XHRyZXR1cm4gdGhpcy5tb2RlbDtcclxuXHRcdFxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS8vXHJcblx0XHRmdW5jdGlvbiB2Mih4LCB5KSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMih4LCB5KTsgfVxyXG5cdFx0ZnVuY3Rpb24gdjMoeCwgeSwgeikgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgeiB8fCAwKTsgfVxyXG5cdFx0ZnVuY3Rpb24gdXYodikge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIodi54IC8gaW5zLncsIHYueSAvIGlucy5oKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gZjQoZywgYSwgYiwgYywgZCwgbWF0aSkge1xyXG5cdFx0XHRnLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKGEsIGIsIGQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBtYXRpKSk7XHJcblx0XHRcdGcuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoYSwgZCwgYywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIG1hdGkpKTtcclxuXHRcdFx0XHJcblx0XHRcdGcuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoZy52ZXJ0aWNlc1thXSksIHV2KGcudmVydGljZXNbYl0pLCB1dihnLnZlcnRpY2VzW2RdKSBdKTtcclxuXHRcdFx0Zy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1dihnLnZlcnRpY2VzW2FdKSwgdXYoZy52ZXJ0aWNlc1tkXSksIHV2KGcudmVydGljZXNbY10pIF0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5cclxuZnVuY3Rpb24gc2V0dXBUeXBld3JpdGVyKHRleHRib3gsIGNhbGxiYWNrKSB7XHJcblx0dGV4dGJveC5hZHZhbmNlID0gbnVsbDtcclxuXHRmdW5jdGlvbiBzZXROZXh0KGNiKSB7XHJcblx0XHR0ZXh0Ym94LmFkdmFuY2UgPSBjYjtcclxuXHR9XHJcblx0XHJcblx0dmFyIGNvbXBsZXRlZFRleHQgPSB0ZXh0Ym94LmVsZW1lbnQuaHRtbCgpO1xyXG5cdHRleHRib3guY29tcGxldGUgPSBmdW5jdGlvbigpe307XHJcblx0ZnVuY3Rpb24gX2NvbXBsZXRlKCkge1xyXG5cdFx0dGV4dGJveC5lbGVtZW50Lmh0bWwoY29tcGxldGVkVGV4dCk7XHJcblx0XHR0ZXh0Ym94LmFkdmFuY2UgPSBibGlua0N1cnNvcjtcclxuXHRcdGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcclxuXHR9O1xyXG5cdFxyXG5cdHRleHRib3gubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSElERV0gPSAxO1xyXG5cdFxyXG5cdC8vQmVjYXVzZSB0ZXh0bm9kZXMgYXJlIG5vdCBcImVsZW1lbnRzXCIsIGFuZCBqcXVlcnkgd29uJ3QgaGlkZSB0ZXh0IG5vZGVzLCBpbiBcclxuXHQvLyBvcmRlciB0byBoaWRlIGV2ZXJ5dGhpbmcsIHdlIG5lZWQgdG8gd3JhcCBldmVyeXRoaW5nIGluIHNwYW4gdGFncy4uLlxyXG5cdHRleHRib3guZWxlbWVudC5jb250ZW50cygpXHJcblx0XHQuZmlsdGVyKGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLm5vZGVUeXBlID09IDM7IH0pXHJcblx0XHQud3JhcChcIjxzcGFuPlwiKTtcclxuXHRcclxuXHR2YXIgZWxlbWVudHMgPSB0ZXh0Ym94LmVsZW1lbnQuY29udGVudHMoKTtcclxuXHQkKGVsZW1lbnRzKS5oaWRlKCk7XHJcblx0XHJcblx0XHJcblx0Ly9Db3BpZWQgYW5kIG1vZGlmaWVkIGZyb20gaHR0cDovL2pzZmlkZGxlLm5ldC95OVBKZy8yNC9cclxuXHR2YXIgaSA9IDA7XHJcblx0ZnVuY3Rpb24gaXRlcmF0ZSgpIHtcclxuXHRcdHRleHRib3guY29tcGxldGUgPSBfY29tcGxldGU7XHJcblx0XHRpZiAoaSA8IGVsZW1lbnRzLmxlbmd0aCkge1xyXG5cdFx0XHQkKGVsZW1lbnRzW2ldKS5zaG93KCk7XHJcblx0XHRcdGFuaW1hdGVOb2RlKGVsZW1lbnRzW2ldLCBpdGVyYXRlKTsgXHJcblx0XHRcdGkrKztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcclxuXHRcdFx0dGV4dGJveC5hZHZhbmNlID0gYmxpbmtDdXJzb3I7XHJcblx0XHR9XHJcblx0fVxyXG5cdHRleHRib3guYWR2YW5jZSA9IGl0ZXJhdGU7XHJcblx0XHJcblx0ZnVuY3Rpb24gYW5pbWF0ZU5vZGUoZWxlbWVudCwgY2FsbGJhY2spIHtcclxuXHRcdHZhciBwaWVjZXMgPSBbXTtcclxuXHRcdGlmIChlbGVtZW50Lm5vZGVUeXBlPT0xKSB7IC8vZWxlbWVudCBub2RlXHJcblx0XHRcdHdoaWxlIChlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xyXG5cdFx0XHRcdHBpZWNlcy5wdXNoKCBlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuZmlyc3RDaGlsZCkgKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2V0TmV4dChmdW5jdGlvbiBjaGlsZFN0ZXAoKSB7XHJcblx0XHRcdFx0aWYgKHBpZWNlcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdGFuaW1hdGVOb2RlKHBpZWNlc1swXSwgY2hpbGRTdGVwKTsgXHJcblx0XHRcdFx0XHRlbGVtZW50LmFwcGVuZENoaWxkKHBpZWNlcy5zaGlmdCgpKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHJcblx0XHR9IGVsc2UgaWYgKGVsZW1lbnQubm9kZVR5cGU9PTMpIHsgLy90ZXh0IG5vZGVcclxuXHRcdFx0cGllY2VzID0gZWxlbWVudC5kYXRhLm1hdGNoKC8uezAsMn0vZyk7IC8vIDI6IE51bWJlciBvZiBjaGFycyBwZXIgZnJhbWVcclxuXHRcdFx0ZWxlbWVudC5kYXRhID0gXCJcIjtcclxuXHRcdFx0KGZ1bmN0aW9uIGFkZFRleHQoKXtcclxuXHRcdFx0XHRlbGVtZW50LmRhdGEgKz0gcGllY2VzLnNoaWZ0KCk7XHJcblx0XHRcdFx0c2V0TmV4dChwaWVjZXMubGVuZ3RoID8gYWRkVGV4dCA6IGNhbGxiYWNrKTtcclxuXHRcdFx0fSkoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0dmFyIHRpY2sgPSAwO1xyXG5cdGZ1bmN0aW9uIGJsaW5rQ3Vyc29yKGRlbHRhKSB7XHJcblx0XHR0aWNrIC09IGRlbHRhO1xyXG5cdFx0aWYgKHRpY2sgPD0gMCkge1xyXG5cdFx0XHR0aWNrID0gNTtcclxuXHRcdFx0dGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXSA9ICF0ZXh0Ym94Lm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX0hJREVdO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuZnVuY3Rpb24gU2tyaW0oKSB7XHJcblx0dGhpcy5fY3JlYXRlQW5pbVByb3AoXCJvcGFjaXR5XCIsIDEpO1xyXG5cdHRoaXMuX2NyZWF0ZUFuaW1Qcm9wKFwiY29sb3JfclwiLCAwKTtcclxuXHR0aGlzLl9jcmVhdGVBbmltUHJvcChcImNvbG9yX2dcIiwgMCk7XHJcblx0dGhpcy5fY3JlYXRlQW5pbVByb3AoXCJjb2xvcl9iXCIsIDApO1xyXG5cdFxyXG59XHJcbmV4dGVuZChTa3JpbS5wcm90b3R5cGUsIHtcclxuXHRtb2RlbCA6IG51bGwsXHJcblx0YW5pbWF0aW5nIDogZmFsc2UsXHJcblx0Y2FsbGJhY2sgOiBudWxsLFxyXG5cdHNwZWVkOiAxLFxyXG5cdFxyXG5cdF9jcmVhdGVBbmltUHJvcDogZnVuY3Rpb24ocHJvcCwgZGVmKSB7XHJcblx0XHR0aGlzW3Byb3BdID0ge1xyXG5cdFx0XHRjdXJyOiBkZWYsXHJcblx0XHRcdHNyYyA6IGRlZixcclxuXHRcdFx0ZGVzdDogZGVmLFxyXG5cdFx0XHRhbHBoYTogMSxcclxuXHRcdH07XHJcblx0fSxcclxuXHRcclxuXHRmYWRlVG8gOiBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHJcblx0XHRpZiAob3B0c1tcImNvbG9yXCJdICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dmFyIGhleCA9IE1hdGguZmxvb3Iob3B0c1tcImNvbG9yXCJdKTtcclxuXHRcdFx0b3B0c1tcImNvbG9yX3JcIl0gPSAoKGhleCA+PiAxNikgJiAyNTUpIC8gMjU1O1xyXG5cdFx0XHRvcHRzW1wiY29sb3JfZ1wiXSA9ICgoaGV4ID4+ICA4KSAmIDI1NSkgLyAyNTU7XHJcblx0XHRcdG9wdHNbXCJjb2xvcl9iXCJdID0gKChoZXggICAgICApICYgMjU1KSAvIDI1NTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIGNiID0gdGhpcy5jYWxsYmFjaztcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7IC8vTWFrZSBzdXJlIHRvIHJlbW92ZSB0aGUgc3RvcmVkIGNhbGxiYWNrIElNTUVERUFURUxZIGxlc3QgaXQgYmUgY2FsbGVkIHR3aWNlIHNvbWVob3cuXHJcblx0XHRcdGNiKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB3aWxsQW5pbSA9IGZhbHNlO1xyXG5cdFx0XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwib3BhY2l0eVwiLCBvcHRzKTtcclxuXHRcdHdpbGxBbmltIHw9IHNldEZhZGUoXCJjb2xvcl9yXCIsIG9wdHMpO1xyXG5cdFx0d2lsbEFuaW0gfD0gc2V0RmFkZShcImNvbG9yX2dcIiwgb3B0cyk7XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwiY29sb3JfYlwiLCBvcHRzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5zcGVlZCA9IG9wdHNbXCJzcGVlZFwiXSB8fCAxO1xyXG5cdFx0XHJcblx0XHRpZiAod2lsbEFuaW0pIHtcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1dvbid0IGFuaW1hdGUsIGRvIHRoZSBjYWxsYmFjayBpbW1lZGVhdGVseVxyXG5cdFx0XHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gc2V0RmFkZShwcm9wLCBvcHRzKSB7XHJcblx0XHRcdGlmIChvcHRzW3Byb3BdID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHRcdFx0c2VsZltwcm9wXS5zcmMgPSBzZWxmW3Byb3BdLmN1cnI7XHJcblx0XHRcdHNlbGZbcHJvcF0uZGVzdCA9IG9wdHNbcHJvcF07XHJcblx0XHRcdGlmIChzZWxmW3Byb3BdLnNyYyAtIHNlbGZbcHJvcF0uZGVzdCA9PSAwKSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBzZWxmW3Byb3BdLmFscGhhID09IDA7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdGlmICghdGhpcy5hbmltYXRpbmcpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dmFyIHVwZGF0ZWQgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcIm9wYWNpdHlcIik7XHJcblx0XHR1cGRhdGVkIHw9IF9hbmltKFwiY29sb3JfclwiKTtcclxuXHRcdHVwZGF0ZWQgfD0gX2FuaW0oXCJjb2xvcl9nXCIpO1xyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcImNvbG9yX2JcIik7XHJcblx0XHRcclxuXHRcdGlmICh1cGRhdGVkKSB7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwub3BhY2l0eSA9IHRoaXMub3BhY2l0eS5jdXJyO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnIgPSBNYXRoLmNsYW1wKHRoaXMuY29sb3Jfci5jdXJyKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5jb2xvci5nID0gTWF0aC5jbGFtcCh0aGlzLmNvbG9yX2cuY3Vycik7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwuY29sb3IuYiA9IE1hdGguY2xhbXAodGhpcy5jb2xvcl9iLmN1cnIpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVGhpcyBmaXhlcyBhIHByb2JsZW0gd2hlcmUgdGhlIFNrcmltIGJsb2NrcyByZW5kZXJpbmcgdGhlIGRpYWxvZyBib3hlcyBiZWhpbmQgaXRcclxuXHRcdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gISF0aGlzLm1vZGVsLm1hdGVyaWFsLm9wYWNpdHk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAodGhpcy5jYWxsYmFjaykge1xyXG5cdFx0XHRcdHZhciBjYiA9IHRoaXMuY2FsbGJhY2s7XHJcblx0XHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7XHJcblx0XHRcdFx0Y2IoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9hbmltKHByb3ApIHtcclxuXHRcdFx0dmFyIHVwZGF0ZWQgPSBzZWxmW3Byb3BdLmFscGhhIDwgMTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGZbcHJvcF0uYWxwaGEgKz0gZGVsdGEgKiAoMC4xICogc2VsZi5zcGVlZCk7XHJcblx0XHRcdGlmIChzZWxmW3Byb3BdLmFscGhhID4gMSkge1xyXG5cdFx0XHRcdHNlbGZbcHJvcF0uYWxwaGEgPSAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmW3Byb3BdLmN1cnIgPSBzZWxmW3Byb3BdLnNyYyArIChzZWxmW3Byb3BdLmRlc3QgLSBzZWxmW3Byb3BdLnNyYykgKiBzZWxmW3Byb3BdLmFscGhhO1xyXG5cdFx0XHRyZXR1cm4gdXBkYXRlZDtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGNyZWF0ZU1vZGVsOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dmFyIHN3ID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCkrMTtcclxuXHRcdHZhciBzaCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKSsxO1xyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0e1xyXG5cdFx0XHRnZW9tLnZlcnRpY2VzID0gW1xyXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0xLCAtMSwgMzApLFxyXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKHN3LCAtMSwgMzApLFxyXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKHN3LCBzaCwgMzApLFxyXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0xLCBzaCwgMzApLFxyXG5cdFx0XHRdO1xyXG5cdFx0XHRnZW9tLmZhY2VzID0gW1xyXG5cdFx0XHRcdG5ldyBUSFJFRS5GYWNlMygwLCAxLCAyKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuRmFjZTMoMiwgMywgMCksXHJcblx0XHRcdF07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xyXG5cdFx0XHRjb2xvcjogMHgwMDAwMDAsXHJcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0dGhpcy5tb2RlbCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHR0aGlzLm1vZGVsLnJlbmRlckRlcHRoID0gLTMwO1xyXG5cdFx0cmV0dXJuIHRoaXMubW9kZWw7XHJcblx0fSxcclxufSk7XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbmZ1bmN0aW9uIEFqYXhMb2FkZXIoKSB7XHJcblx0XHJcbn1cclxuZXh0ZW5kKEFqYXhMb2FkZXIucHJvdG90eXBlLCB7XHJcblx0bm9kZSA6IG51bGwsXHJcblx0bV9oZWxpeCA6IG51bGwsXHJcblx0bV9wcm9ncmVzcyA6IFtdLFxyXG5cdG1fc3Bpbm5lciA6IFtdLFxyXG5cdFxyXG5cdHByb2dyZXNzOiAwLFxyXG5cdHByb2dyZXNzX3RvdGFsOiAxMDAsXHJcblx0b3BhY2l0eTogMCxcclxuXHRfb3BhY2l0eV9zcGVlZDogMC4yLFxyXG5cdHNwaW46IDAsXHJcblx0X3NwaW5fc3BlZWQ6IDkwLFxyXG5cdF9zcGluX2ZhbGxvZmY6IDUwMCxcclxuXHRcclxuXHRsZXR0ZXJkZWZzIDogW1xyXG5cdFx0LypcIkFcIiA6Ki8gWzMsIDNdLFxyXG5cdFx0LypcIkJcIiA6Ki8gWzQsIDNdLFxyXG5cdFx0LypcIlhcIiA6Ki8gWzMsIDJdLFxyXG5cdFx0LypcIllcIiA6Ki8gWzQsIDJdLFxyXG5cdFx0LypcIkxcIiA6Ki8gWzAsIDBdLFxyXG5cdFx0LypcIlJcIiA6Ki8gWzEsIDBdLFxyXG5cdFx0LypcIlNcIiA6Ki8gWzIsIDBdLFxyXG5cdFx0LypcIlVBXCI6Ki8gWzMsIDFdLFxyXG5cdFx0LypcIkRBXCI6Ki8gWzQsIDFdLFxyXG5cdFx0LypcIkxBXCI6Ki8gWzMsIDBdLFxyXG5cdFx0LypcIlJBXCI6Ki8gWzQsIDBdLFxyXG5cdF0sXHJcblx0XHJcblx0c2hvdzogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm9wYWNpdHkgPSAxO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1fcHJvZ3Jlc3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ubWF0ZXJpYWwubWFwLm9mZnNldC5zZXQoXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHQodGhpcy5sZXR0ZXJkZWZzW3JuZF1bMV0gKiAxNikgLyA2NFxyXG5cdFx0XHQpXHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRoaWRlOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMub3BhY2l0eSA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA9PSAwICYmIHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IDw9IDApIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA+IHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5KSB7XHJcblx0XHRcdHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ID1cclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ICsgZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5vcGFjaXR5IDwgdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkpIHtcclxuXHRcdFx0dGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgPSBcclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IC0gZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG5sID0gdGhpcy5tX3Byb2dyZXNzLmxlbmd0aDsgLy9udW1iZXIgb2YgbGV0dGVyc1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBubDsgaSsrKSB7XHJcblx0XHRcdC8vdmFyIG8gPSAodGhpcy5wcm9ncmVzcyAvIHRoaXMucHJvZ3Jlc3NfdG90YWwpICogbmw7XHJcblx0XHRcdHZhciBvID0gKHRoaXMucHJvZ3Jlc3NfdG90YWwgLyBubCk7XHJcblx0XHRcdHRoaXMubV9wcm9ncmVzc1tpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKCh0aGlzLnByb2dyZXNzLShvKmkpKSAvIG8pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNwaW4gKz0gZGVsdGEgKiB0aGlzLl9zcGluX3NwZWVkO1xyXG5cdFx0aWYgKHRoaXMuc3BpbiA+IDgwMCkgdGhpcy5zcGluIC09IDgwMDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tX3NwaW5uZXIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIG8gPSB0aGlzLnNwaW4gLSAoaSAqIDEwMCk7XHJcblx0XHRcdGlmIChvIDwgMCkgbyArPSA4MDA7XHJcblx0XHRcdG8gPSAoLW8gKyB0aGlzLl9zcGluX2ZhbGxvZmYpIC8gdGhpcy5fc3Bpbl9mYWxsb2ZmO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKG8pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKG8gPCAwKSB7XHJcblx0XHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVsxXSAqIDE2KSAvIDY0XHJcblx0XHRcdFx0KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0dmFyIHNoID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSg4LCA4KTtcclxuXHRcdFxyXG5cdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKEFKQVhfVEVYVFVSRV9JTUcpO1xyXG5cdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMig0OC8xMjgsIDQ4LzY0KTtcclxuXHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAxNi82NCk7IC8vUmVtZW1iZXIsIGJvdHRvbSByaWdodCBpcyBvcmlnaW5cclxuXHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdF9lbnN1cmVVcGRhdGUodGV4KTtcclxuXHRcdFxyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdG1hcDogdGV4LFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1faGVsaXggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tX2hlbGl4LnNjYWxlLnNldCgzLCAzLCAzKTtcclxuXHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi5zZXQoMTYrMjQsIHNoLTI0LTE2LCA0MCk7XHJcblx0XHR0aGlzLm1faGVsaXgucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHR0aGlzLm5vZGUuYWRkKHRoaXMubV9oZWxpeCk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5wb3NpdGlvbi5zZXQoXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnggKyAoTWF0aC5zaW4oaSooTWF0aC5QSS80KSkgKiAyNCksXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnkgKyAoTWF0aC5jb3MoaSooTWF0aC5QSS80KSkgKiAyNCksIFxyXG5cdFx0XHRcdDM5KTtcclxuXHRcdFx0dGhpcy5tX3NwaW5uZXJbaV0ucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgcm5kID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5sZXR0ZXJkZWZzLmxlbmd0aCk7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVswXSAqIDE2KSAvIDEyOCwgXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzFdICogMTYpIC8gNjRcclxuXHRcdFx0KVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ucG9zaXRpb24uc2V0KFxyXG5cdFx0XHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi54KzQ0KyhpKjE2KSwgXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnksIDQwKTtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldLnJlbmRlckRlcHRoID0gLTQwO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGhpcy5ub2RlO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfY3JlYXRlTGV0dGVyKCkge1xyXG5cdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoQUpBWF9URVhUVVJFX0lNRyk7XHJcblx0XHRcdHRleC5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0dGV4LndyYXBTID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdHRleC53cmFwVCA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHR0ZXgucmVwZWF0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMTYvMTI4LCAxNi82NCk7XHJcblx0XHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRfZW5zdXJlVXBkYXRlKHRleCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRtYXA6IHRleCxcclxuXHRcdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0XHRvcGFjaXR5OiAwLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdFx0c2VsZi5ub2RlLmFkZChtZXNoKTtcclxuXHRcdFx0cmV0dXJuIG1lc2g7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9lbnN1cmVVcGRhdGUodGV4KSB7XHJcblx0XHRcdEFKQVhfVEVYVFVSRV9JTUcub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlREVCVUdTZXR1cCgpIHtcclxuXHR0aGlzLl9tYWluQ2FtZXJhID0gdGhpcy5jYW1lcmE7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEgPSB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgXHJcblx0XHQkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKS8gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpLFxyXG5cdFx0MC4xLCAxMDAwMCk7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEucG9zaXRpb24ueiA9IDEwO1xyXG5cdHRoaXMuc2NlbmUuYWRkKHRoaXMuX2RlYnVnQ2FtZXJhKTtcclxuXHRcclxuXHRcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQ2FtZXJhSGVscGVyKHRoaXMuX21haW5DYW1lcmEpKTtcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQXhpc0hlbHBlcig1KSk7XHJcblx0XHJcblx0dmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5fZGVidWdDYW1lcmEpO1xyXG5cdGNvbnRyb2xzLmRhbXBpbmcgPSAwLjI7XHJcblx0XHJcblx0dmFyIG9sZGxvZ2ljID0gdGhpcy5sb2dpY0xvb3A7XHJcblx0dGhpcy5sb2dpY0xvb3AgPSBmdW5jdGlvbihkZWx0YSl7XHJcblx0XHRjb250cm9scy51cGRhdGUoKTtcclxuXHRcdG9sZGxvZ2ljLmNhbGwodGhpcywgZGVsdGEpO1xyXG5cdH07XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVUlNYW5hZ2VyKCk7XHJcbiIsIi8vIG1hcC5qc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIG5kYXJyYXkgPSByZXF1aXJlKFwibmRhcnJheVwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIFBsYXllckNoYXIgPSByZXF1aXJlKFwidHBwLXBjXCIpO1xyXG5cclxudmFyIE9iakxvYWRlciA9IHJlcXVpcmUoXCIuL21vZGVsL29iai1sb2FkZXJcIik7XHJcblxyXG52YXIgbVNldHVwID0gcmVxdWlyZShcIi4vbW9kZWwvbWFwLXNldHVwXCIpO1xyXG5cclxuXHJcbi8vIFRoZXNlIHdvdWxkIGJlIENPTlNUcyBpZiB3ZSB3ZXJlbid0IGluIHRoZSBicm93c2VyXHJcbnZhciBFWFRfTUFQQlVORExFID0gXCIuemlwXCI7IC8vRXh0ZW5zaW9uIGZvciByZXF1ZXN0aW5nIG1hcCBidW5kbGVzXHJcbnZhciBERUZfSEVJR0hUX1NURVAgPSAwLjU7IC8vRGVmYXVsdCBZIHRyYW5zbGF0aW9uIGFtb3VudCBhIGhlaWdodCBzdGVwIHRha2VzLiBUaGlzIGNhbiBiZSBkZWZpbmVkIGluIGEgbWFwIGZpbGUuXHJcblxyXG5cclxuLy8gSWYgeW91IG1ha2UgYW55IGNoYW5nZXMgaGVyZSwgbWFrZSBzdXJlIHRvIG1pcnJvciB0aGVtIGluIGJ1aWxkL21hcC16aXBwZXIuanMhXHJcbmZ1bmN0aW9uIGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHZhbCkge1xyXG5cdC8vIFRpbGVEYXRhOiBNTU1NTFcwMCBUVFRISEhISFxyXG5cdC8vIFdoZXJlOlxyXG5cdC8vICAgIE0gPSBNb3ZlbWVudCwgQml0cyBhcmU6IChEb3duLCBVcCwgTGVmdCwgUmlnaHQpXHJcblx0Ly8gICAgTCA9IExlZGdlIGJpdCAodGhpcyB0aWxlIGlzIGEgbGVkZ2U6IHlvdSBqdW1wIG92ZXIgaXQgd2hlbiBnaXZlbiBwZXJtaXNzaW9uIHRvIGVudGVyIGl0KVxyXG5cdC8vICAgIFcgPSBXYXRlciBiaXQgKHRoaXMgdGlsZSBpcyB3YXRlcjogbW9zdCBhY3RvcnMgYXJlIGRlbmllZCBlbnRyeSBvbnRvIHRoaXMgdGlsZSlcclxuXHQvLyAgICBIID0gSGVpZ2h0ICh2ZXJ0aWNhbCBsb2NhdGlvbiBvZiB0aGUgY2VudGVyIG9mIHRoaXMgdGlsZSlcclxuXHQvLyAgICBUID0gVHJhbnNpdGlvbiBUaWxlICh0cmFuc2l0aW9uIHRvIGFub3RoZXIgTGF5ZXIgd2hlbiBzdGVwcGluZyBvbiB0aGlzIHRpbGUpXHJcblx0dmFyIHByb3BzID0ge307XHJcblx0XHJcblx0dmFyIG1vdmVtZW50ID0gKCh2YWwgPj4gMTIpICYgMHhGKTtcclxuXHQvLyBtb3ZlbWVudCBpcyBibG9ja2VkIGlmIGEgbW92ZW1lbnQgZmxhZyBpcyB0cnVlOlxyXG5cdHByb3BzLm1vdmVtZW50ID0ge307XHJcblx0cHJvcHMubW92ZW1lbnRbXCJkb3duXCJdICA9ICEhKG1vdmVtZW50ICYgMHg4KTtcclxuXHRwcm9wcy5tb3ZlbWVudFtcInVwXCJdICAgID0gISEobW92ZW1lbnQgJiAweDQpO1xyXG5cdHByb3BzLm1vdmVtZW50W1wibGVmdFwiXSAgPSAhIShtb3ZlbWVudCAmIDB4Mik7XHJcblx0cHJvcHMubW92ZW1lbnRbXCJyaWdodFwiXSA9ICEhKG1vdmVtZW50ICYgMHgxKTtcclxuXHRcclxuXHRwcm9wcy5pc1dhbGthYmxlID0gISEofm1vdmVtZW50ICYgMHhGKTtcclxuXHRwcm9wcy5pc0xlZGdlID0gISEodmFsICYgKDB4MSA8PCAxMSkpO1xyXG5cdHByb3BzLmlzV2F0ZXIgPSAhISh2YWwgJiAoMHgxIDw8IDEwKSk7XHJcblx0XHJcblx0cHJvcHMudHJhbnNpdGlvbiA9ICgodmFsID4+IDUpICYgMHg3KTtcclxuXHRcclxuXHRwcm9wcy5oZWlnaHQgPSAoKHZhbCkgJiAweDFGKTtcclxuXHRcclxuXHRwcm9wcy5ub05QQyA9ICEhKHZhbCAmICgweDEgPDwgOSkpO1xyXG5cdFxyXG5cdHJldHVybiBwcm9wcztcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICpcclxuICpcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIE1hcChpZCwgb3B0cyl7XHJcblx0dGhpcy5pZCA9IGlkO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHRHQy5hbGxvY2F0ZUJpbihcIm1hcF9cIitpZCk7XHJcblx0dGhpcy5nYyA9IEdDLmdldEJpbihcIm1hcF9cIitpZCk7XHJcblx0XHJcblx0dGhpcy5maWxlU3lzID0gbmV3IHppcC5mcy5GUygpO1xyXG59XHJcbmluaGVyaXRzKE1hcCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE1hcC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsIC8vbWFwJ3MgaW50ZXJuYWwgaWRcclxuXHRcclxuXHRmaWxlOiBudWxsLCAvL1ppcCBmaWxlIGhvbGRpbmcgYWxsIGRhdGFcclxuXHRmaWxlU3lzOiBudWxsLCAvL0N1cnJlbnQgemlwIGZpbGUgc3lzdGVtIGZvciB0aGlzIG1hcFxyXG5cdHhocjogbnVsbCwgLy9hY3RpdmUgeGhyIHJlcXVlc3RcclxuXHRsb2FkRXJyb3IgOiBudWxsLFxyXG5cdFxyXG5cdG1ldGFkYXRhIDogbnVsbCxcclxuXHRvYmpkYXRhIDogbnVsbCxcclxuXHRtdGxkYXRhIDogbnVsbCxcclxuXHRcclxuXHRsU2NyaXB0VGFnIDogbnVsbCxcclxuXHRnU2NyaXB0VGFnIDogbnVsbCxcclxuXHRcclxuXHRjYW1lcmE6IG51bGwsXHJcblx0Y2FtZXJhczogbnVsbCxcclxuXHRzY2VuZTogbnVsbCxcclxuXHRtYXBtb2RlbDogbnVsbCxcclxuXHRcclxuXHRzcHJpdGVOb2RlOiBudWxsLFxyXG5cdGxpZ2h0Tm9kZTogbnVsbCxcclxuXHRjYW1lcmFOb2RlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvYWQgTWFuYWdlbWVudCBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRkaXNwb3NlIDogZnVuY3Rpb24oKXtcclxuXHRcdCQodGhpcy5sU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdCQodGhpcy5nU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHBsYXllciAmJiBwbGF5ZXIucGFyZW50KSBwbGF5ZXIucGFyZW50LnJlbW92ZShwbGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5maWxlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZmlsZVN5cztcclxuXHRcdGRlbGV0ZSB0aGlzLnhocjtcclxuXHRcdGRlbGV0ZSB0aGlzLmxvYWRFcnJvcjtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubWV0YWRhdGE7XHJcblx0XHRkZWxldGUgdGhpcy5vYmpkYXRhO1xyXG5cdFx0ZGVsZXRlIHRoaXMubXRsZGF0YTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubFNjcmlwdFRhZztcclxuXHRcdGRlbGV0ZSB0aGlzLmdTY3JpcHRUYWc7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLnRpbGVkYXRhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zY2VuZTtcclxuXHRcdGRlbGV0ZSB0aGlzLm1hcG1vZGVsO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zcHJpdGVOb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMubGlnaHROb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhTm9kZTtcclxuXHRcdFxyXG5cdFx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcclxuXHRcdHRoaXMuZ2MuZGlzcG9zZSgpO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZ2M7XHJcblx0fSxcclxuXHRcclxuXHQvKiogQmVnaW4gZG93bmxvYWQgb2YgdGhpcyBtYXAncyB6aXAgZmlsZSwgcHJlbG9hZGluZyB0aGUgZGF0YS4gKi9cclxuXHRkb3dubG9hZCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRpZiAodGhpcy5maWxlKSByZXR1cm47IC8vd2UgaGF2ZSB0aGUgZmlsZSBpbiBtZW1vcnkgYWxyZWFkeSwgZG8gbm90aGluZ1xyXG5cdFx0aWYgKHRoaXMueGhyKSByZXR1cm47IC8vYWxyZWFkeSBnb3QgYW4gYWN0aXZlIHJlcXVlc3QsIGRvIG5vdGhpbmdcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIHhociA9IHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBCQVNFVVJMK1wiL21hcHMvXCIrdGhpcy5pZCtFWFRfTUFQQlVORExFKTtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiWEhSOiBcIiwgeGhyKTtcclxuXHRcdHhoci5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcclxuXHRcdFx0XHRzZWxmLmZpbGUgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdFx0c2VsZi5lbWl0KFwiZG93bmxvYWRlZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1I6XCIsIHhoci5zdGF0dXNUZXh0KTtcclxuXHRcdFx0XHRzZWxmLmxvYWRFcnJvciA9IHhoci5zdGF0dXNUZXh0O1xyXG5cdFx0XHRcdHNlbGYuZW1pdChcImxvYWQtZXJyb3JcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcInByb2dyZXNzXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlBST0dSRVNTOlwiLCBlKTtcclxuXHRcdFx0aWYgKGUubGVuZ3RoQ29tcHV0YWJsZSkge1xyXG5cdFx0XHRcdC8vIHZhciBwZXJjZW50RG9uZSA9IGUubG9hZGVkIC8gZS50b3RhbDtcclxuXHRcdFx0XHRzZWxmLmVtaXQoXCJwcm9ncmVzc1wiLCBlLmxvYWRlZCwgZS50b3RhbCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly9tYXJxdWVlIGJhclxyXG5cdFx0XHRcdHNlbGYuZW1pdChcInByb2dyZXNzXCIsIC0xKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJlcnJvclwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJjYW5jZWxlZFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkNBTkNFTEVEOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHQvL1RPRE8gb24gZXJyb3IgYW5kIG9uIGNhbmNlbGVkXHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiAgUmVhZHMgdGhlIHRpbGUgZGF0YSBhbmQgYmVnaW5zIGxvYWRpbmcgdGhlIHJlcXVpcmVkIHJlc291cmNlcy5cclxuXHQgKi9cclxuXHRsb2FkIDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICghdGhpcy5maWxlKSB7IC8vSWYgZmlsZSBpc24ndCBkb3dubG9hZGVkIHlldCwgZGVmZXIgbG9hZGluZ1xyXG5cdFx0XHR0aGlzLm9uY2UoXCJkb3dubG9hZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c2VsZi5sb2FkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmRvd25sb2FkKCk7XHJcblx0XHRcdC8vVE9ETyB0aHJvdyB1cCBsb2FkaW5nIGdpZlxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5maWxlU3lzLmltcG9ydEJsb2IodGhpcy5maWxlLCBmdW5jdGlvbiBzdWNjZXNzKCl7XHJcblx0XHRcdC8vbG9hZCB1cCB0aGUgbWFwIVxyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5qc29uXCIpLmdldFRleHQoX19qc29uTG9hZGVkLCBfX2xvZ1Byb2dyZXNzKTtcclxuXHRcdFx0c2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoXCJtYXAub2JqXCIpLmdldFRleHQoX19vYmpMb2FkZWQsIF9fbG9nUHJvZ3Jlc3MpO1xyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5tdGxcIikuZ2V0VGV4dChfX210bExvYWRlZCwgX19sb2dQcm9ncmVzcyk7XHJcblx0XHRcdFxyXG5cdFx0fSwgZnVuY3Rpb24gZXJyb3IoZSl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiRVJST1I6IFwiLCBlKTtcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZC1lcnJvclwiKTsgLy9TZW5kIHRvIHRoZSBkb3JpdG8gZHVuZ2VvblxyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm47IFxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvZ1Byb2dyZXNzKCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlBST0dSRVNTXCIsIGFyZ3VtZW50cyk7XHJcblx0XHR9XHJcblx0XHQvL0NhbGxiYWNrIGNoYWluIGJlbG93XHJcblx0XHRmdW5jdGlvbiBfX2pzb25Mb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm1ldGFkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYudGlsZWRhdGEgPSBuZGFycmF5KHNlbGYubWV0YWRhdGEubWFwLCBbc2VsZi5tZXRhZGF0YS53aWR0aCwgc2VsZi5tZXRhZGF0YS5oZWlnaHRdLCBbMSwgc2VsZi5tZXRhZGF0YS53aWR0aF0pO1xyXG5cdFx0XHRpZiAoc2VsZi5tZXRhZGF0YVtcImhlaWdodHN0ZXBcIl0gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHNlbGYubWV0YWRhdGFbXCJoZWlnaHRzdGVwXCJdID0gREVGX0hFSUdIVF9TVEVQO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc2VsZi5tZXRhZGF0YVtcImJnbXVzaWNcIl0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHNlbGYuX2xvYWRNdXNpYyhzZWxmLm1ldGFkYXRhW1wiYmdtdXNpY1wiXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuZW1pdChcImxvYWRlZC1tZXRhXCIpO1xyXG5cdFx0XHRfX2xvYWREb25lKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fb2JqTG9hZGVkKGRhdGEpIHtcclxuXHRcdFx0c2VsZi5vYmpkYXRhID0gZGF0YTtcclxuXHRcdFx0X19tb2RlbExvYWRlZCgpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19tdGxMb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm10bGRhdGEgPSBkYXRhO1xyXG5cdFx0XHRfX21vZGVsTG9hZGVkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX21vZGVsTG9hZGVkKCkge1xyXG5cdFx0XHRpZiAoIXNlbGYub2JqZGF0YSB8fCAhc2VsZi5tdGxkYXRhKSByZXR1cm47IC8vZG9uJ3QgYmVnaW4gcGFyc2luZyB1bnRpbCB0aGV5J3JlIGJvdGggbG9hZGVkXHJcblx0XHRcdFxyXG5cdFx0XHRmdW5jdGlvbiBsb2FkVGV4dHVyZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcclxuXHRcdFx0XHR2YXIgZmlsZSA9IHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKGZpbGVuYW1lKTtcclxuXHRcdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIFRFWFRVUkU6IE5vIHN1Y2ggZmlsZSBpbiBtYXAgYnVuZGxlISBcIitmaWxlbmFtZSk7XHJcblx0XHRcdFx0XHRjYWxsYmFjayhERUZfVEVYVFVSRSk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZpbGUuZ2V0QmxvYihcImltYWdlL3BuZ1wiLCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0XHR2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTCh1cmwpO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2sodXJsKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG9iamxkciA9IG5ldyBPYmpMb2FkZXIoc2VsZi5vYmpkYXRhLCBzZWxmLm10bGRhdGEsIGxvYWRUZXh0dXJlLCB7XHJcblx0XHRcdFx0Z2M6IHNlbGYuZ2MsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRvYmpsZHIub24oXCJsb2FkXCIsIF9fbW9kZWxSZWFkeSk7XHJcblx0XHRcdG9iamxkci5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbW9kZWxSZWFkeShvYmopIHtcclxuXHRcdFx0c2VsZi5tYXBtb2RlbCA9IG9iajtcclxuXHRcdFx0Ly8gX190ZXN0X19vdXRwdXRUcmVlKG9iaik7XHJcblx0XHRcdHNlbGYub2JqZGF0YSA9IHNlbGYubXRsZGF0YSA9IHRydWU7IC8vd2lwZSB0aGUgYmlnIHN0cmluZ3MgZnJvbSBtZW1vcnlcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZGVkLW1vZGVsXCIpO1xyXG5cdFx0XHRfX2xvYWREb25lKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZERvbmUoKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiX19sb2FkRG9uZVwiLCAhIXNlbGYubWFwbW9kZWwsICEhc2VsZi50aWxlZGF0YSk7XHJcblx0XHRcdGlmICghc2VsZi5tYXBtb2RlbCB8fCAhc2VsZi50aWxlZGF0YSkgcmV0dXJuOyAvL2Rvbid0IGNhbGwgb24gX2luaXQgYmVmb3JlIGJvdGggYXJlIGxvYWRlZFxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5faW5pdCgpO1xyXG5cdFx0XHRzZWxmLm1hcmtMb2FkRmluaXNoZWQoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdF9sb2FkTXVzaWM6IGZ1bmN0aW9uKG11c2ljZGVmKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdGlmICghbXVzaWNkZWYpIHJldHVybjtcclxuXHRcdGlmICghJC5pc0FycmF5KG11c2ljZGVmKSkgbXVzaWNkZWYgPSBbbXVzaWNkZWZdO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG11c2ljZGVmLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChTb3VuZE1hbmFnZXIuaXNNdXNpY0xvYWRlZChtdXNpY2RlZltpXS5pZCkpIGNvbnRpbnVlOyAvL211c2ljIGFscmVhZHkgbG9hZGVkXHJcblx0XHRcdF9fbG9hZE11c2ljRnJvbUZpbGUobXVzaWNkZWZbaV0uaWQsIGksIGZ1bmN0aW9uKGlkeCwgdXJsLCBkYXRhKXtcclxuXHRcdFx0XHRTb3VuZE1hbmFnZXIubG9hZE11c2ljKG11c2ljZGVmW2lkeF0uaWQsIHtcclxuXHRcdFx0XHRcdGRhdGE6IGRhdGEsXHJcblx0XHRcdFx0XHR1cmw6IHVybCxcclxuXHRcdFx0XHRcdGxvb3BTdGFydDogbXVzaWNkZWZbaWR4XS5sb29wU3RhcnQsXHJcblx0XHRcdFx0XHRsb29wRW5kOiBtdXNpY2RlZltpZHhdLmxvb3BFbmQsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzZWxmLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlNdXNpYyhtdXNpY2RlZlswXS5pZCk7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvYWRNdXNpY0Zyb21GaWxlKG11c2ljaWQsIGlkeCwgY2FsbGJhY2spIHtcclxuXHRcdFx0c2VsZi5tYXJrTG9hZGluZyhcIkJHTVVTSUNfXCIrbXVzaWNpZCk7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dmFyIGRpciA9IHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwiYmdtdXNpY1wiKTtcclxuXHRcdFx0XHRpZiAoIWRpcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIk5vIGJnbXVzaWMgZm9sZGVyIGluIHRoZSBtYXAgZmlsZSFcIik7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBmaWxlID0gZGlyLmdldENoaWxkQnlOYW1lKG11c2ljaWQrXCIubXAzXCIpO1xyXG5cdFx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIk5vIGJnbXVzaWMgd2l0aCBuYW1lICdcIittdXNpY2lkK1wiLm1wM1wiK1wiJyAhXCIpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRmdW5jdGlvbiBvblByb2dyZXNzKGluZGV4LCB0b3RhbCl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIk11c2ljIExvYWQgUHJvZ3Jlc3M6IFwiLCBpbmRleCwgdG90YWwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRmaWxlLmdldEJsb2IoXCJhdWRpby9tcGVnXCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdFx0dmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdFx0XHRzZWxmLmdjLmNvbGxlY3RVUkwodXJsKTtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKGlkeCwgdXJsLCBkYXRhKTtcclxuXHRcdFx0XHRcdHNlbGYubWFya0xvYWRGaW5pc2hlZChcIkJHTVVTSUNfXCIrbXVzaWNpZCk7XHJcblx0XHRcdFx0fSwgb25Qcm9ncmVzcyk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjYWxsYmFjayhlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIHRoZSBtYXAgZm9yIGRpc3BsYXkgZnJvbSB0aGUgc3RvcmVkIGRhdGEuXHJcblx0ICovXHJcblx0X2luaXQgOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cdFx0dGhpcy5jYW1lcmFzID0ge307XHJcblx0XHRcclxuXHRcdGlmICghd2luZG93LnBsYXllcikge1xyXG5cdFx0XHR3aW5kb3cucGxheWVyID0gbmV3IFBsYXllckNoYXIoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5tYXBtb2RlbCk7XHJcblx0XHRcclxuXHRcdHRoaXMuY2FtZXJhTG9naWNzID0gW107XHJcblx0XHRtU2V0dXAuc2V0dXBSaWdnaW5nLmNhbGwodGhpcyk7XHJcblx0XHQvLyBNYXAgTW9kZWwgaXMgbm93IHJlYWR5XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLm1ldGFkYXRhLmNsZWFyQ29sb3IpXHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2V0Q2xlYXJDb2xvckhleCggdGhpcy5tZXRhZGF0YS5jbGVhckNvbG9yICk7XHJcblx0XHRcclxuXHRcdHRoaXMuX2luaXRFdmVudE1hcCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmVtaXQoXCJtYXAtcmVhZHlcIik7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIFRpbGUgSW5mb3JtYXRpb24gXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0dGlsZWRhdGEgOiBudWxsLFxyXG5cdFxyXG5cdGdldFRpbGVEYXRhIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dmFyIHRpbGUgPSBjb252ZXJ0U2hvcnRUb1RpbGVQcm9wcyh0aGlzLnRpbGVkYXRhLmdldCh4LCB5KSk7XHJcblx0XHRyZXR1cm4gdGlsZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldExheWVyVHJhbnNpdGlvbiA6IGZ1bmN0aW9uKHgsIHksIGN1cnJMYXllcikge1xyXG5cdFx0Y3VyckxheWVyID0gKGN1cnJMYXllciE9PXVuZGVmaW5lZCk/IGN1cnJMYXllciA6IDE7XHJcblx0XHR2YXIgdGlsZSA9IHRoaXMuZ2V0VGlsZURhdGEoeCwgeSk7XHJcblx0XHR2YXIgbGF5ZXIgPSB0aWxlLnRyYW5zaXRpb247XHJcblx0XHR2YXIgb3JpZ2luMSA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2N1cnJMYXllci0xXVtcIjJkXCJdO1xyXG5cdFx0dmFyIG9yaWdpbjIgPSB0aGlzLm1ldGFkYXRhLmxheWVyc1tsYXllci0xXVtcIjJkXCJdO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRsYXllcjogbGF5ZXIsXHJcblx0XHRcdHg6IHggLSBvcmlnaW4xWzBdICsgb3JpZ2luMlswXSxcclxuXHRcdFx0eTogeSAtIG9yaWdpbjFbMV0gKyBvcmlnaW4yWzFdLFxyXG5cdFx0fTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldDNEVGlsZUxvY2F0aW9uIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIHRpbGVkYXRhKSB7XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0eSA9IHgueTsgeCA9IHgueDtcclxuXHRcdH1cclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykge1xyXG5cdFx0XHRsYXllciA9IHguejsgeSA9IHgueTsgeCA9IHgueDtcclxuXHRcdH1cclxuXHRcdGxheWVyID0gKGxheWVyIHx8IDEpIC0gMTtcclxuXHRcdGlmICghdGlsZWRhdGEpIHRpbGVkYXRhID0gdGhpcy5nZXRUaWxlRGF0YSh4LCB5KTtcclxuXHRcdFxyXG5cdFx0dmFyIGxheWVyZGF0YSA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2xheWVyXTtcclxuXHRcdHZhciB6ID0gdGlsZWRhdGEuaGVpZ2h0ICogdGhpcy5tZXRhZGF0YS5oZWlnaHRzdGVwO1xyXG5cdFx0XHJcblx0XHR2YXIgbG9jID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeiwgeSk7XHJcblx0XHRsb2MueCAtPSBsYXllcmRhdGFbXCIyZFwiXVswXTtcclxuXHRcdGxvYy56IC09IGxheWVyZGF0YVtcIjJkXCJdWzFdO1xyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcclxuXHRcdG1hdC5zZXQuYXBwbHkobWF0LCBsYXllcmRhdGFbXCIzZFwiXSk7XHJcblx0XHRsb2MuYXBwbHlNYXRyaXg0KG1hdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBsb2M7XHJcblx0fSxcclxuXHQvKlxyXG5cdGdldEFsbFdhbGthYmxlVGlsZXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0aWxlcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgbGkgPSAxOyBsaSA8PSA3OyBsaSsrKSB7XHJcblx0XHRcdGlmICghdGhpcy5tZXRhZGF0YS5sYXllcnNbbGktMV0pIGNvbnRpbnVlO1xyXG5cdFx0XHR0aWxlc1tsaV0gPSBbXTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5tZXRhZGF0YS5oZWlnaHQ7IHkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5tZXRhZGF0YS53aWR0aDsgeCsrKSB7XHJcblx0XHRcdFx0XHR2YXIgdGRhdGEgPSB0aGlzLmdldFRpbGVEYXRhKHgsIHkpO1xyXG5cdFx0XHRcdFx0aWYgKCF0ZGF0YS5pc1dhbGthYmxlKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dGRhdGFbXCIzZGxvY1wiXSA9IHRoaXMuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGksIHRkYXRhKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dGlsZXNbbGldLnB1c2godGRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRpbGVzO1xyXG5cdH0sICovXHJcblx0XHJcblx0Z2V0UmFuZG9tTlBDU3Bhd25Qb2ludCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLm1ldGFkYXRhLm5wY3NwYXducykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCByZXF1ZXN0ZWQgTlBDIFNwYXduIFBvaW50IG9uIGEgbWFwIHdoZXJlIG5vbmUgYXJlIGRlZmluZWQhXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgcHRzID0gdGhpcy5tZXRhZGF0YS5fbnBjU3Bhd25zQXZhaWw7XHJcblx0XHRpZiAoIXB0cyB8fCAhcHRzLmxlbmd0aCkge1xyXG5cdFx0XHRwdHMgPSB0aGlzLm1ldGFkYXRhLl9ucGNTcGF3bnNBdmFpbCA9IHRoaXMubWV0YWRhdGEubnBjc3Bhd25zLnNsaWNlKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHB0cy5sZW5ndGgpO1xyXG5cdFx0dmFyIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKHB0c1tpbmRleF1bMF0sIHB0c1tpbmRleF1bMV0sIHB0c1tpbmRleF1bMl0gfHwgMSk7XHJcblx0XHRwdHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdHJldHVybiB2ZWM7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIGNhbldhbGtCZXR3ZWVuOiBJZiBpdCBpcyBwb3NzaWJsZSB0byB3YWxrIGZyb20gb25lIHRpbGUgdG8gYW5vdGhlci4gVGhlIHR3b1xyXG5cdCAqIFx0XHR0aWxlcyBtdXN0IGJlIGFkamFjZW50LCBvciBmYWxzZSBpcyBpbW1lZGVhdGVseSByZXR1cm5lZC5cclxuXHQgKiByZXR1cm5zOlxyXG5cdCAqIFx0XHRmYWxzZSA9IGNhbm5vdCwgMSA9IGNhbiwgMiA9IG11c3QganVtcCwgNCA9IG11c3Qgc3dpbS9zdXJmXHJcblx0ICovXHJcblx0Y2FuV2Fsa0JldHdlZW4gOiBmdW5jdGlvbihzcmN4LCBzcmN5LCBkZXN0eCwgZGVzdHksIGlnbm9yZUV2ZW50cyl7XHJcblx0XHRpZiAoTWF0aC5hYnMoc3JjeCAtIGRlc3R4KSArIE1hdGguYWJzKHNyY3kgLSBkZXN0eSkgIT0gMSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHQvLyBJZiB3ZSdyZSBzb21laG93IGFscmVhZHkgb3V0c2lkZSB0aGUgbWFwLCB1bmNvbmRpdGlvbmFsbHkgYWxsb3cgdGhlbSB0byB3YWxrIGFyb3VuZCB0byBnZXQgYmFjayBpblxyXG5cdFx0aWYgKHNyY3ggPCAwIHx8IHNyY3ggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIHRydWU7XHJcblx0XHRpZiAoc3JjeSA8IDAgfHwgc3JjeSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIHRydWU7XHJcblx0XHRcclxuXHRcdC8vIFNhbml0eSBjaGVjayBlZGdlcyBvZiB0aGUgbWFwXHJcblx0XHRpZiAoZGVzdHggPCAwIHx8IGRlc3R4ID49IHRoaXMubWV0YWRhdGEud2lkdGgpIHJldHVybiBmYWxzZTtcclxuXHRcdGlmIChkZXN0eSA8IDAgfHwgZGVzdHkgPj0gdGhpcy5tZXRhZGF0YS5oZWlnaHQpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dmFyIHNyY3RpbGUgPSB0aGlzLmdldFRpbGVEYXRhKHNyY3gsIHNyY3kpO1xyXG5cdFx0dmFyIGRlc3R0aWxlID0gdGhpcy5nZXRUaWxlRGF0YShkZXN0eCwgZGVzdHkpO1xyXG5cdFx0XHJcblx0XHRpZiAoIWRlc3R0aWxlLmlzV2Fsa2FibGUpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0aWYgKCFpZ25vcmVFdmVudHMpIHsgLy9jaGVjayBmb3IgdGhlIHByZXNlbnNlIG9mIGV2ZW50c1xyXG5cdFx0XHR2YXIgZXZ0cyA9IHRoaXMuZXZlbnRNYXAuZ2V0KGRlc3R4LCBkZXN0eSk7XHJcblx0XHRcdGlmIChldnRzKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWV2dHNbaV0uY2FuV2Fsa09uKCkpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGNhbldhbGsgPSB0cnVlOyAvL0Fzc3VtZSB3ZSBjYW4gdHJhdmVsIGJldHdlZW4gdW50aWwgcHJvdmVuIG90aGVyd2lzZS5cclxuXHRcdHZhciBtdXN0SnVtcCwgbXVzdFN3aW0sIG11c3RUcmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gKGZ1bmN0aW9uKCl7XHJcblx0XHRcdHN3aXRjaCAoMSkge1xyXG5cdFx0XHRcdGNhc2UgKHNyY3kgLSBkZXN0eSk6IHJldHVybiBbXCJ1cFwiLCBcImRvd25cIl07XHJcblx0XHRcdFx0Y2FzZSAoZGVzdHkgLSBzcmN5KTogcmV0dXJuIFtcImRvd25cIiwgXCJ1cFwiXTtcclxuXHRcdFx0XHRjYXNlIChzcmN4IC0gZGVzdHgpOiByZXR1cm4gW1wibGVmdFwiLCBcInJpZ2h0XCJdO1xyXG5cdFx0XHRcdGNhc2UgKGRlc3R4IC0gc3JjeCk6IHJldHVybiBbXCJyaWdodFwiLCBcImxlZnRcIl07XHJcblx0XHRcdH0gcmV0dXJuIG51bGw7XHJcblx0XHR9KSgpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3JjdGlsZS5tb3ZlbWVudFtkaXJbMF1dKSB7IC8vaWYgbW92ZW1lbnQgPSB0cnVlLCBtZWFucyB3ZSBjYW4ndCB3YWxrIHRoZXJlXHJcblx0XHRcdGlmIChzcmN0aWxlLmlzTGVkZ2UpIFxyXG5cdFx0XHRcdG11c3RKdW1wID0gdHJ1ZTtcclxuXHRcdFx0ZWxzZSBjYW5XYWxrID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRjYW5XYWxrICY9ICFkZXN0dGlsZS5tb3ZlbWVudFtkaXJbMV1dO1xyXG5cdFx0XHJcblx0XHRtdXN0U3dpbSA9IGRlc3R0aWxlLmlzV2F0ZXI7XHJcblx0XHRcclxuXHRcdG11c3RUcmFuc2l0aW9uID0gISFkZXN0dGlsZS50cmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHRtdXN0QmVQbGF5ZXIgPSAhIWRlc3R0aWxlLm5vTlBDO1xyXG5cdFx0XHJcblx0XHRpZiAoIWNhbldhbGspIHJldHVybiBmYWxzZTtcclxuXHRcdHJldHVybiAoY2FuV2Fsaz8weDE6MCkgfCAobXVzdEp1bXA/MHgyOjApIHwgKG11c3RTd2ltPzB4NDowKSB8IChtdXN0VHJhbnNpdGlvbj8weDg6MCkgfCAobXVzdEJlUGxheWVyPzB4MTA6MCk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBFdmVudCBIYW5kbGluZyBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfbG9jYWxJZCA6IDAsXHJcblx0ZXZlbnRMaXN0IDogbnVsbCxcclxuXHRldmVudE1hcCA6IG51bGwsXHJcblx0XHJcblx0X2luaXRFdmVudE1hcCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHJcblx0XHR0aGlzLmV2ZW50TGlzdCA9IHt9O1xyXG5cdFx0dmFyIHcgPSB0aGlzLm1ldGFkYXRhLndpZHRoLCBoID0gdGhpcy5tZXRhZGF0YS5oZWlnaHQ7XHJcblx0XHR0aGlzLmV2ZW50TWFwID0gbmRhcnJheShuZXcgQXJyYXkodypoKSwgW3csIGhdLCBbMSwgd10pO1xyXG5cdFx0dGhpcy5ldmVudE1hcC5wdXQgPSBmdW5jdGlvbih4LCB5LCB2YWwpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmdldCh4LCB5KSkge1xyXG5cdFx0XHRcdHRoaXMuc2V0KHgsIHksIFtdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodGhpcy5nZXQoeCwgeSkuaW5kZXhPZih2YWwpID49IDApIHJldHVybjsgLy9kb24ndCBkb3VibGUgYWRkXHJcblx0XHRcdHRoaXMuZ2V0KHgsIHkpLnB1c2godmFsKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLmV2ZW50TWFwLnJlbW92ZSA9IGZ1bmN0aW9uKHgsIHksIHZhbCkge1xyXG5cdFx0XHRpZiAoIXRoaXMuZ2V0KHgsIHkpKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0dmFyIGkgPSB0aGlzLmdldCh4LCB5KS5pbmRleE9mKHZhbCk7XHJcblx0XHRcdGlmICh0aGlzLmdldCh4LCB5KS5sZW5ndGgtMSA+IDApIHtcclxuXHRcdFx0XHQvL1RyeWluZyB0byBmaW5kIHRoZSBCdWcgb2YgdGhlIFBoYW50b20gU3ByaXRlcyFcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJSRU1PVklORyBFVkVOVCBGUk9NIE5PTi1FTVBUWSBMSVNUOiBcIiwgdGhpcy5nZXQoeCwgeSksIFwiaW5kZXg6XCIsIGkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChpID09IC0xKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KHgsIHkpLnNwbGljZShpLCAxKTtcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHRoaXMuc3ByaXRlTm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0dGhpcy5zcHJpdGVOb2RlLm5hbWUgPSBcIlNwcml0ZSBSaWdcIjtcclxuXHRcdHRoaXMuc3ByaXRlTm9kZS5wb3NpdGlvbi55ID0gMC4yMTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMuc3ByaXRlTm9kZSk7XHJcblx0XHRcclxuXHRcdC8vIExvYWQgZXZlbnQganMgZmlsZXMgbm93OlxyXG5cdFx0dGhpcy5fX2xvYWRTY3JpcHQoXCJsXCIpOyAvLyBMb2FkIGxvY2FsbHkgZGVmaW5lZCBldmVudHNcclxuXHRcdHRoaXMuX19sb2FkU2NyaXB0KFwiZ1wiKTsgLy8gTG9hZCBnbG9iYWxseSBkZWZpbmVkIGV2ZW50c1xyXG5cdFx0XHJcblx0XHQvLyBBZGQgdGhlIHBsYXllciBjaGFyYWN0ZXIgZXZlbnRcclxuXHRcdHRoaXMuX2luaXRQbGF5ZXJDaGFyYWN0ZXIoKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0X19sb2FkU2NyaXB0IDogZnVuY3Rpb24odCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGZpbGUgPSB0aGlzLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZSh0K1wiX2V2dC5qc1wiKTtcclxuXHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBFVkVOVFM6IE5vIFwiK3QrXCJfZXZ0LmpzIGZpbGUgaXMgcHJlc2VudCBpbiB0aGUgbWFwIGJ1bmRsZS5cIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGZpbGUuZ2V0QmxvYihcInRleHQvamF2YXNjcmlwdFwiLCBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0Ly8gTk9URTogV2UgY2Fubm90IHVzZSBKUXVlcnkoKS5hcHBlbmQoKSwgYXMgaXQgZGVsaWJyYXRlbHkgY2xlYW5zIHRoZSBzY3JpcHQgdGFnc1xyXG5cdFx0XHQvLyAgIG91dCBvZiB0aGUgZG9tIGVsZW1lbnQgd2UncmUgYXBwZW5kaW5nLCBsaXRlcmFsbHkgZGVmZWF0aW5nIHRoZSBwdXJwb3NlLlxyXG5cdFx0XHQvLyBOT1RFMjogV2UgYXBwZW5kIHRvIHRoZSBET00gaW5zdGVhZCBvZiB1c2luZyBldmFsKCkgb3IgbmV3IEZ1bmN0aW9uKCkgYmVjYXVzZVxyXG5cdFx0XHQvLyAgIHdoZW4gYXBwZW5kZWQgbGlrZSBzbywgdGhlIGluLWJyb3dzZXJkZWJ1Z2dlciBzaG91bGQgYmUgYWJsZSB0byBmaW5kIGl0IGFuZFxyXG5cdFx0XHQvLyAgIGJyZWFrcG9pbnQgaW4gaXQuXHJcblx0XHRcdHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xyXG5cdFx0XHRzY3JpcHQudHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XHJcblx0XHRcdHNjcmlwdC5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEpO1xyXG5cdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcblx0XHRcdHRoaXNbdCtcIlNjcmlwdFRhZ1wiXSA9IHNjcmlwdDtcclxuXHRcdFx0Ly8gVXBvbiBiZWluZyBhZGRlZCB0byB0aGUgYm9keSwgaXQgaXMgZXZhbHVhdGVkXHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmdjLmNvbGxlY3Qoc2NyaXB0KTtcclxuXHRcdFx0c2VsZi5nYy5jb2xsZWN0VVJMKHNjcmlwdC5zcmMpO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRhZGRFdmVudCA6IGZ1bmN0aW9uKGV2dCkge1xyXG5cdFx0aWYgKCFldnQpIHJldHVybjtcclxuXHRcdGlmICghKGV2dCBpbnN0YW5jZW9mIEV2ZW50KSkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkF0dGVtcHRlZCB0byBhZGQgYW4gb2JqZWN0IHRoYXQgd2Fzbid0IGFuIEV2ZW50ISBcIiArIGV2dCk7XHJcblx0XHRcclxuXHRcdGlmICghZXZ0LnNob3VsZEFwcGVhcigpKSByZXR1cm47XHJcblx0XHRpZiAoIWV2dC5pZClcclxuXHRcdFx0ZXZ0LmlkID0gXCJMb2NhbEV2ZW50X1wiICsgKCsrdGhpcy5fbG9jYWxJZCk7XHJcblx0XHRcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdC8vbm93IGFkZGluZyBldmVudCB0byBtYXBcclxuXHRcdHRoaXMuZXZlbnRMaXN0W2V2dC5pZF0gPSBldnQ7XHJcblx0XHRpZiAoZXZ0LmxvY2F0aW9uKSB7XHJcblx0XHRcdHRoaXMuZXZlbnRNYXAucHV0KGV2dC5sb2NhdGlvbi54LCBldnQubG9jYXRpb24ueSwgZXZ0KTtcclxuXHRcdH0gZWxzZSBpZiAoZXZ0LmxvY2F0aW9ucykge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dC5sb2NhdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgbG9jID0gZXZ0LmxvY2F0aW9uc1tpXTtcclxuXHRcdFx0XHR0aGlzLmV2ZW50TWFwLnB1dChsb2MueCwgbG9jLnksIGV2dCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9yZWdpc3RlcmluZyBsaXN0ZW5lcnMgb24gdGhlIGV2ZW50XHJcblx0XHRldnQub24oXCJtb3ZpbmdcIiwgX21vdmluZyA9IGZ1bmN0aW9uKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSl7XHJcblx0XHRcdC8vU3RhcnRlZCBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFx0XHRzZWxmLmV2ZW50TWFwLnB1dChkZXN0WCwgZGVzdFksIHRoaXMpO1xyXG5cdFx0XHRzZWxmLmV2ZW50TWFwLnJlbW92ZShzcmNYLCBzcmNZLCB0aGlzKTtcclxuXHRcdFx0aWYgKHNlbGYuZXZlbnRNYXAuZ2V0KHNyY1gsIHNyY1kpLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHQvL1RyeWluZyB0byBmaW5kIHRoZSBCdWcgb2YgdGhlIFBoYW50b20gU3ByaXRlcyFcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJFVkVOVCBIQVMgTU9WRUQgRlJPTSBOT04tRU1QVFkgTE9DQVRJT04hXCIsIGV2dC5uYW1lKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRpciA9IG5ldyBUSFJFRS5WZWN0b3IzKHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpO1xyXG5cdFx0XHR2YXIgbHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImVudGVyaW5nLXRpbGVcIiwgZGlyLCBkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJlbnRlcmluZy10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpci5zZXQoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSkubmVnYXRlKCk7XHJcblx0XHRcdGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwibGVhdmluZy10aWxlXCIsIGRpciwgc3JjWCwgc3JjWSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImxlYXZpbmctdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmdjLmNvbGxlY3RMaXN0ZW5lcihldnQsIFwibW92aW5nXCIsIF9tb3ZpbmcpO1xyXG5cdFx0XHJcblx0XHRldnQub24oXCJtb3ZlZFwiLCBfbW92ZWQgPSBmdW5jdGlvbihzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpe1xyXG5cdFx0XHQvL0ZpbmlzaGVkIG1vdmluZyBmcm9tIHRoZSBvbGQgdGlsZVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRpciA9IG5ldyBUSFJFRS5WZWN0b3IzKHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpO1xyXG5cdFx0XHR2YXIgbHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImVudGVyZWQtdGlsZVwiLCBkaXIsIGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImVudGVyZWQtdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBkaXIuc2V0KHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpLm5lZ2F0ZSgpO1xyXG5cdFx0XHRsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChzcmNYLCBzcmNZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImxlZnQtdGlsZVwiLCBkaXIsIHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJsZWZ0LXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5nYy5jb2xsZWN0TGlzdGVuZXIoZXZ0LCBcIm1vdmVkXCIsIF9tb3ZlZCk7XHJcblx0XHRcclxuXHRcdHZhciBnYyA9IChldnQgPT0gcGxheWVyKT8gR0MuZ2V0QmluKCkgOiB0aGlzLmdjOyAvL2Rvbid0IHB1dCB0aGUgcGxheWVyIGluIHRoaXMgbWFwJ3MgYmluXHJcblx0XHR2YXIgYXZhdGFyID0gZXZ0LmdldEF2YXRhcih0aGlzLCBnYyk7XHJcblx0XHRpZiAoYXZhdGFyKSB7XHJcblx0XHRcdHZhciBsb2MgPSBldnQubG9jYXRpb247XHJcblx0XHRcdHZhciBsb2MzID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbihsb2MueCwgbG9jLnksIGxvYy56KTtcclxuXHRcdFx0YXZhdGFyLnBvc2l0aW9uLnNldChsb2MzKTtcclxuXHRcdFx0YXZhdGFyLnVwZGF0ZU1hdHJpeCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5zcHJpdGVOb2RlLmFkZChhdmF0YXIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRldnQuZW1pdChcImNyZWF0ZWRcIik7XHJcblx0fSxcclxuXHRcclxuXHRsb2FkU3ByaXRlIDogZnVuY3Rpb24oZXZ0aWQsIGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5tYXJrTG9hZGluZyhcIlNQUklURV9cIitldnRpZCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR2YXIgZGlyID0gdGhpcy5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoZXZ0aWQpO1xyXG5cdFx0XHRpZiAoIWRpcikge1xyXG5cdFx0XHRcdGNhbGxiYWNrKChcIk5vIHN1YmZvbGRlciBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGZpbGUgPSBkaXIuZ2V0Q2hpbGRCeU5hbWUoZmlsZW5hbWUpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRjYWxsYmFjaygoXCJObyBhc3NldCB3aXRoIG5hbWUgJ1wiK2ZpbGVuYW1lK1wiJyBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0ZmlsZS5nZXRCbG9iKFwiaW1hZ2UvcG5nXCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEpO1xyXG5cdFx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTCh1cmwpO1xyXG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIHVybCk7XHJcblx0XHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiU1BSSVRFX1wiK2V2dGlkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNhbGxiYWNrKGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2luaXRQbGF5ZXJDaGFyYWN0ZXIgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghd2luZG93LnBsYXllcikge1xyXG5cdFx0XHR3aW5kb3cucGxheWVyID0gbmV3IFBsYXllckNoYXIoKTtcclxuXHRcdH1cclxuXHRcdHZhciB3YXJwID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCB8fCAwO1xyXG5cdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbd2FycF07XHJcblx0XHRpZiAoIXdhcnApIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiUmVxdWVzdGVkIHdhcnAgbG9jYXRpb24gZG9lc24ndCBleGlzdDpcIiwgd2luZG93LnRyYW5zaXRpb25fd2FycHRvKTtcclxuXHRcdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbMF07XHJcblx0XHR9XHJcblx0XHRpZiAoIXdhcnApIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbWFwIGhhcyBubyB3YXJwcyEhXCIpO1xyXG5cdFx0XHJcblx0XHRwbGF5ZXIucmVzZXQoKTtcclxuXHRcdHBsYXllci53YXJwVG8od2FycCk7XHJcblx0XHRcclxuXHRcdHRoaXMuYWRkRXZlbnQocGxheWVyKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0ZGlzcGF0Y2ggOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgZXZ0cyA9IHRoaXMuZXZlbnRNYXAuZ2V0KHgsIHkpO1xyXG5cdFx0aWYgKCFldnRzKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRldnRzW2ldLmVtaXQuYXBwbHkoZXZ0c1tpXSwgYXJncyk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvL1xyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9tYXBSdW5TdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRNYXBSdW5TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9tYXBSdW5TdGF0ZSkge1xyXG5cdFx0XHR0aGlzLl9tYXBSdW5TdGF0ZSA9IHtcclxuXHRcdFx0XHRsb2FkVG90YWwgOiAwLFxyXG5cdFx0XHRcdGxvYWRQcm9ncmVzcyA6IDAsXHJcblx0XHRcdFx0bG9hZGluZ0Fzc2V0cyA6IHt9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlzU3RhcnRlZCA6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXJ0UXVldWUgOiBbXSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRlbmRRdWV1ZSA6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuX21hcFJ1blN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0bWFya0xvYWRpbmcgOiBmdW5jdGlvbihhc3NldElkKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdHN0YXRlLmxvYWRUb3RhbCsrO1xyXG5cdFx0aWYgKGFzc2V0SWQpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKVxyXG5cdFx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0gPSAwO1xyXG5cdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKys7XHJcblx0XHR9XHJcblx0fSxcclxuXHRtYXJrTG9hZEZpbmlzaGVkIDogZnVuY3Rpb24oYXNzZXRJZCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRzdGF0ZS5sb2FkUHJvZ3Jlc3MrKztcclxuXHRcdGlmIChhc3NldElkKSB7XHJcblx0XHRcdGlmICghc3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSlcclxuXHRcdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdID0gMDtcclxuXHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXS0tO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL1RPRE8gYmVnaW4gbWFwIHN0YXJ0XHJcblx0XHRpZiAoc3RhdGUubG9hZFByb2dyZXNzID49IHN0YXRlLmxvYWRUb3RhbCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJTVEFSVCBNQVBcIik7XHJcblx0XHRcdHRoaXMuX2V4ZWN1dGVNYXBTdGFydENhbGxiYWNrcygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0cXVldWVGb3JNYXBTdGFydCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKCFzdGF0ZS5pc1N0YXJ0ZWQpIHtcclxuXHRcdFx0c3RhdGUuc3RhcnRRdWV1ZS5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfZXhlY3V0ZU1hcFN0YXJ0Q2FsbGJhY2tzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbGxiYWNrO1xyXG5cdFx0d2hpbGUgKGNhbGxiYWNrID0gc3RhdGUuc3RhcnRRdWV1ZS5zaGlmdCgpKSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRzdGF0ZS5pc1N0YXJ0ZWQgPSB0cnVlO1xyXG5cdFx0dGhpcy5lbWl0KFwibWFwLXN0YXJ0ZWRcIik7XHJcblx0fSxcclxuXHRcclxuXHRfZXhlY3V0ZU1hcEVuZENhbGxiYWNrcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBjYWxsYmFjaztcclxuXHRcdHdoaWxlIChjYWxsYmFjayA9IHN0YXRlLmVuZFF1ZXVlLnNoaWZ0KCkpIHtcclxuXHRcdFx0Y2FsbGJhY2soKTtcclxuXHRcdH1cclxuXHRcdC8vIHN0YXRlLmlzU3RhcnRlZCA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRcclxuXHRcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gTG9naWMgTG9vcCBhbmQgTWFwIEJlaGF2aW9yc1xyXG5cdGNhbWVyYUxvZ2ljczogbnVsbCxcclxuXHRcclxuXHRsb2dpY0xvb3AgOiBmdW5jdGlvbihkZWx0YSl7XHJcblx0XHRpZiAodGhpcy5ldmVudExpc3QpIHtcclxuXHRcdFx0Zm9yICh2YXIgbmFtZSBpbiB0aGlzLmV2ZW50TGlzdCkge1xyXG5cdFx0XHRcdHZhciBldnQgPSB0aGlzLmV2ZW50TGlzdFtuYW1lXTtcclxuXHRcdFx0XHRpZiAoIWV2dCkgY29udGludWU7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZXZ0LmVtaXQoXCJ0aWNrXCIsIGRlbHRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5jYW1lcmFMb2dpY3MpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNhbWVyYUxvZ2ljcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHRoaXMuY2FtZXJhTG9naWNzW2ldLmNhbGwodGhpcywgZGVsdGEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gTWFwO1xyXG5cclxuXHJcbmZ1bmN0aW9uIF9fdGVzdF9fb3V0cHV0VHJlZShvYmosIGluZGVudCkge1xyXG5cdGluZGVudCA9IChpbmRlbnQgPT09IHVuZGVmaW5lZCk/IDAgOiBpbmRlbnQ7XHJcblx0XHJcblx0dmFyIG91dCA9IFwiW1wiK29iai50eXBlK1wiOiBcIjtcclxuXHRvdXQgKz0gKCghb2JqLm5hbWUpP1wiPFVubmFtZWQ+XCI6b2JqLm5hbWUpO1xyXG5cdG91dCArPSBcIiBdXCI7XHJcblx0XHJcblx0c3dpdGNoIChvYmoudHlwZSkge1xyXG5cdFx0Y2FzZSBcIk1lc2hcIjpcclxuXHRcdFx0b3V0ICs9IFwiICh2ZXJ0cz1cIitvYmouZ2VvbWV0cnkudmVydGljZXMubGVuZ3RoO1xyXG5cdFx0XHRvdXQgKz0gXCIgZmFjZXM9XCIrb2JqLmdlb21ldHJ5LmZhY2VzLmxlbmd0aDtcclxuXHRcdFx0b3V0ICs9IFwiIG1hdD1cIitvYmoubWF0ZXJpYWwubmFtZTtcclxuXHRcdFx0b3V0ICs9IFwiKVwiO1xyXG5cdFx0XHRicmVhaztcclxuXHR9XHJcblx0XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xyXG5cdFx0b3V0ID0gXCJ8IFwiICsgb3V0O1xyXG5cdH1cclxuXHRjb25zb2xlLmxvZyhvdXQpO1xyXG5cdFxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRfX3Rlc3RfX291dHB1dFRyZWUob2JqLmNoaWxkcmVuW2ldLCBpbmRlbnQrMSk7XHJcblx0fVxyXG59XHJcblxyXG5cclxuIiwiLy8gZHVuZ2Vvbi1tYXAuanNcclxuLy8gRGVmaW5pdGlvbiBvZiB0aGUgRG9yaXRvIER1bmdlb25cclxuXHJcbi8vICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7XHJcbi8vIOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWsiDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIE1hcCA9IHJlcXVpcmUoXCIuLi9tYXAuanNcIik7XHJcbnZhciBQbGF5ZXJDaGFyID0gcmVxdWlyZShcInRwcC1wY1wiKTtcclxudmFyIG1TZXR1cCA9IHJlcXVpcmUoXCIuL21hcC1zZXR1cFwiKTtcclxuXHJcblxyXG5mdW5jdGlvbiBEb3JpdG9EdW5nZW9uKCkge1xyXG5cdE1hcC5jYWxsKHRoaXMsIFwieER1bmdlb25cIik7XHJcbn1cclxuaW5oZXJpdHMoRG9yaXRvRHVuZ2VvbiwgTWFwKTtcclxuZXh0ZW5kKERvcml0b0R1bmdlb24ucHJvdG90eXBlLCB7XHJcblx0Ly8gT3ZlcnJpZGUgdG8gZG8gbm90aGluZ1xyXG5cdGRvd25sb2FkOiBmdW5jdGlvbigpIHt9LCBcclxuXHRcclxuXHQvLyBMb2FkIG1vZGVsIGludG8gdGhlIG1hcG1vZGVsIHByb3BlcnR5XHJcblx0bG9hZDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm1hcmtMb2FkaW5nKFwiTUFQX21hcGRhdGFcIik7XHJcblx0XHRcclxuXHRcdHRoaXMubWV0YWRhdGEgPSB7XHJcblx0XHRcdGFyZWFuYW1lIDogXCJUaGUgRG9yaXRvIER1bmdlb25cIixcclxuXHRcdFx0d2lkdGg6IDUwLFxyXG5cdFx0XHRoZWlnaHQ6IDUwLFxyXG5cdFx0XHRcclxuXHRcdFx0XCJsYXllcnNcIiA6IFtcclxuXHRcdFx0XHR7XCJsYXllclwiOiAxLCBcIjNkXCI6IFsxLCAwLCAwLCAtMjUuNSwgICAwLCAxLCAwLCAwLCAgIDAsIDAsIDEsIC0yNS41LCAgIDAsIDAsIDAsIDFdLCBcIjJkXCI6IFs1LCAxMF0gfSxcclxuXHRcdFx0XSxcclxuXHRcdFx0XCJ3YXJwc1wiIDogW1xyXG5cdFx0XHRcdHsgXCJsb2NcIiA6IFsyNSwgMjVdLCBcImFuaW1cIiA6IDAgfSxcclxuXHRcdFx0XSxcclxuXHRcdFx0XHJcblx0XHRcdC8vIGNsZWFyQ29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0dGhpcy50aWxlZGF0YSA9IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpeyByZXR1cm4gMDsgfSxcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRvcml0b2RlZnMgPSBbXHJcblx0XHRcdFs1LCAwXSwgWzUsIDFdLCBbNSwgMl0sIFs1LCAzXSxcclxuXHRcdFx0WzYsIDBdLCBbNiwgMV0sIFs2LCAyXSwgWzYsIDNdLFxyXG5cdFx0XHRbNywgMF0sIFs3LCAxXSwgWzcsIDJdLCBbNywgM10sXHJcblx0XHRdO1xyXG5cdFx0XHJcblx0XHR2YXIgbW9kZWwgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdHsgLy8gRG9yaXRvIEJHXHJcblx0XHRcdHZhciBvZmZzZXRzID0gW107XHJcblx0XHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0XHRcdHRoaXMuZ2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFx0Zm9yICh2YXIgayA9IDA7IGsgPCA1MCAqIGRvcml0b2RlZnMubGVuZ3RoOyBrICsrICkge1xyXG5cdFx0XHRcdHZhciB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRcdHZlcnRleC54ID0gTWF0aC5yYW5kb20oKSAqIDIwMCAtIDEwMDtcclxuXHRcdFx0XHR2ZXJ0ZXgueSA9IE1hdGgucmFuZG9tKCkgKiAtNTAgLSAxO1xyXG5cdFx0XHRcdHZlcnRleC56ID0gTWF0aC5yYW5kb20oKSAqIDIwMCAtIDE4MDtcclxuXHJcblx0XHRcdFx0Z2VvbS52ZXJ0aWNlcy5wdXNoKCB2ZXJ0ZXggKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgZGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkb3JpdG9kZWZzLmxlbmd0aCk7XHJcblx0XHRcdFx0b2Zmc2V0cy5wdXNoKG5ldyBUSFJFRS5WZWN0b3IyKFxyXG5cdFx0XHRcdFx0KGRvcml0b2RlZnNbZGldWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHRcdChkb3JpdG9kZWZzW2RpXVsxXSAqIDE2KSAvIDY0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciB0ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShBSkFYX1RFWFRVUkVfSU1HKTtcclxuXHRcdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdHRleC5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXgud3JhcFMgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0dGV4LndyYXBUID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigxNi8xMjgsIDE2LzY0KTtcclxuXHRcdFx0Ly8gdGV4Lm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IyKFxyXG5cdFx0XHQvLyBcdChkb3JpdG9kZWZzW2ldWzBdICogMTYpIC8gMTI4LFxyXG5cdFx0XHQvLyBcdChkb3JpdG9kZWZzW2ldWzFdICogMTYpIC8gNjQpO1xyXG5cdFx0XHR0ZXguZ2VuZXJhdGVNaXBtYXBzID0gZmFsc2U7XHJcblx0XHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB2YXIgbWF0ID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7XHJcblx0XHRcdC8vIFx0c2l6ZTogTWF0aC5yYW5kb20oKSoyKzEsIHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0XHQvLyBcdG1hcDogdGV4LFxyXG5cdFx0XHQvLyB9KTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtYXQgPSBuZXcgRG9yaXRvQ2xvdWRNYXRlcmlhbCh7XHJcblx0XHRcdFx0bWFwOiB0ZXgsIHNpemU6IDEwLCBzY2FsZTogMTAwLFxyXG5cdFx0XHRcdG9mZnNldHM6IG9mZnNldHMsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNsb3VkID0gbmV3IFRIUkVFLlBvaW50Q2xvdWQoZ2VvbSwgbWF0KTtcclxuXHRcdFx0Y2xvdWQuc29ydFBhcnRpY2xlcyA9IHRydWVcclxuXHRcdFx0bW9kZWwuYWRkKGNsb3VkKTtcclxuXHRcdH17XHJcblx0XHRcdHZhciBoZWlnaHQgPSA2MDtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoNDAwLCA1MCwgaGVpZ2h0KTtcclxuXHRcdFx0Ly8gZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLnZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIFx0dmFyIGMgPSAoZ2VvbS52ZXJ0aWNlc1tpXS55ICsgKGhlaWdodC8yKSkgLyBoZWlnaHQ7XHJcblx0XHRcdC8vIFx0Z2VvbS5jb2xvcnMucHVzaChuZXcgVEhSRUUuQ29sb3IoIGMsIGMgKiAwLjUsIDAgKSk7XHJcblx0XHRcdC8vIH1cclxuXHRcdFx0dmFyIGZhY2VpZHggPSBbJ2EnLCAnYicsICdjJ107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5mYWNlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBmYWNlID0gZ2VvbS5mYWNlc1tpXTtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGZhY2VpZHgubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdHZhciB2ZXJ0ID0gZ2VvbS52ZXJ0aWNlc1sgZmFjZVtmYWNlaWR4W2pdXSBdO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgYyA9ICh2ZXJ0LnkgKyAoaGVpZ2h0LzIpKSAvIGhlaWdodDtcclxuXHRcdFx0XHRcdGZhY2UudmVydGV4Q29sb3JzW2pdID0gbmV3IFRIUkVFLkNvbG9yKGMsIGMgKiAwLjUsIDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Y29uc29sZS5sb2coZ2VvbS5jb2xvcnMpO1xyXG5cdFx0XHRnZW9tLmNvbG9yc05lZWRVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGUsXHJcblx0XHRcdFx0dmVydGV4Q29sb3JzOiBUSFJFRS5WZXJ0ZXhDb2xvcnMsXHJcblx0XHRcdFx0ZGVwdGhXcml0ZTogZmFsc2UsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGJnID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdFx0YmcucmVuZGVyRGVwdGggPSAxMDtcclxuXHRcdFx0YmcucG9zaXRpb24ueSA9IC01MDtcclxuXHRcdFx0bW9kZWwuYWRkKGJnKTtcclxuXHRcdH1cclxuXHRcdHRoaXMubWFwbW9kZWwgPSBtb2RlbDtcclxuXHRcdFxyXG5cdFx0dGhpcy5faW5pdCgpO1xyXG5cdFx0dGhpcy5tYXJrTG9hZEZpbmlzaGVkKFwiTUFQX21hcGRhdGFcIik7XHJcblx0fSxcclxuXHRcclxuXHRfaW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHR0aGlzLmNhbWVyYXMgPSB7fTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLm1hcG1vZGVsKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5jYW1lcmFMb2dpY3MgPSBbXTtcclxuXHRcdC8vIG1TZXR1cC5zZXR1cFJpZ2dpbmcuY2FsbCh0aGlzKTtcclxuXHRcdC8vTk9URTogTm8gbGlnaHRzXHJcblx0XHRcclxuXHRcdHRoaXMuc2NlbmUuYWRkKFxyXG5cdFx0XHRtU2V0dXAuY2FtZXJhLmdlbjQuY2FsbCh0aGlzLCB7XHJcblx0XHRcdFx0XCJ0eXBlXCIgOiBcImdlbjRcIixcclxuXHRcdFx0XHRcImNhbWVyYXNcIjoge1xyXG5cdFx0XHRcdFx0MDoge30sXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0dGhpcy5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheU11c2ljKFwibV90b3Jud29ybGRcIik7XHJcblx0XHRcdFVJLnNrcmltLnNwZWVkID0gMC4yOyAvL1RoaXMgd2lsbCBvdmVycmlkZSB0aGUgc3BlZWQgb2YgdGhlIGZhZGVpbiBkb25lIGJ5IHRoZSBtYXAgbWFuYWdlci5cclxuXHRcdFx0Ly8gVUkuZmFkZU91dCgwLjIpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHRocmVlUmVuZGVyZXIuc2V0Q2xlYXJDb2xvckhleCggMHgwMDAwMDAgKTtcclxuXHRcdFxyXG5cdFx0Ly8gTWFwIE1vZGVsIGlzIG5vdyByZWFkeVxyXG5cdFx0XHJcblx0XHR0aGlzLl9pbml0RXZlbnRNYXAoKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5lbWl0KFwibWFwLXJlYWR5XCIpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRfX2xvYWRTY3JpcHQgOiBmdW5jdGlvbih0KSB7XHJcblx0XHRpZiAodCAhPSBcImxcIikgcmV0dXJuOyAvL0xvY2FsIG9ubHlcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIGxvY2FsIGV2ZW50c1xyXG5cdFx0Ly9UT0RPIEFkZCBHbWFubiBoZXJlIHRvIHRha2UgeW91IGJhY2sgdG8gdGhlIG1haW4gd29ybGRcclxuXHR9LFxyXG5cdFxyXG5cdGNhbldhbGtCZXR3ZWVuIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgZGVzdHgsIGRlc3R5LCBpZ25vcmVFdmVudHMpIHtcclxuXHRcdGlmIChNYXRoLmFicyhzcmN4IC0gZGVzdHgpICsgTWF0aC5hYnMoc3JjeSAtIGRlc3R5KSAhPSAxKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmIChkZXN0eCA8IDAgfHwgZGVzdHggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKGRlc3R5IDwgMCB8fCBkZXN0eSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHRpZiAoIWlnbm9yZUV2ZW50cykgeyAvL2NoZWNrIGZvciB0aGUgcHJlc2Vuc2Ugb2YgZXZlbnRzXHJcblx0XHRcdHZhciBldnRzID0gdGhpcy5ldmVudE1hcC5nZXQoZGVzdHgsIGRlc3R5KTtcclxuXHRcdFx0aWYgKGV2dHMpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghZXZ0c1tpXS5jYW5XYWxrT24oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9LFxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9yaXRvRHVuZ2VvbjtcclxuXHJcblxyXG5mdW5jdGlvbiBEb3JpdG9DbG91ZE1hdGVyaWFsKHRleHR1cmUsIG9wdHMpIHtcclxuXHRpZiAoJC5pc1BsYWluT2JqZWN0KHRleHR1cmUpICYmIG9wdHMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0b3B0cyA9IHRleHR1cmU7IHRleHR1cmUgPSBudWxsO1xyXG5cdH1cclxuXHRcclxuXHR0aGlzLm1hcCA9IHRleHR1cmUgfHwgb3B0cy50ZXh0dXJlIHx8IG9wdHMubWFwIHx8IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0dGhpcy5vZmZzZXRzID0gb3B0cy5vZmZzZXRzIHx8IFtdO1xyXG5cdHRoaXMucmVwZWF0ID0gb3B0cy5yZXBlYXQgfHwgdGhpcy5tYXAucmVwZWF0O1xyXG5cdFxyXG5cdHRoaXMuc2l6ZSA9IG9wdHMuc2l6ZSB8fCAxO1xyXG5cdHRoaXMuc2NhbGUgPSBvcHRzLnNjYWxlIHx8IDE7XHJcblx0XHJcblx0dmFyIHBhcmFtcyA9IHRoaXMuX2NyZWF0ZU1hdFBhcmFtcyhvcHRzKTtcclxuXHRUSFJFRS5TaGFkZXJNYXRlcmlhbC5jYWxsKHRoaXMsIHBhcmFtcyk7XHJcblx0dGhpcy50eXBlID0gXCJEb3JpdG9DbG91ZE1hdGVyaWFsXCI7XHJcblx0XHJcblx0dGhpcy50cmFuc3BhcmVudCA9IChvcHRzLnRyYW5zcGFyZW50ICE9PSB1bmRlZmluZWQpPyBvcHRzLnRyYW5zcGFyZW50IDogdHJ1ZTtcclxuXHR0aGlzLmFscGhhVGVzdCA9IDAuMDU7XHJcbn1cclxuaW5oZXJpdHMoRG9yaXRvQ2xvdWRNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoRG9yaXRvQ2xvdWRNYXRlcmlhbC5wcm90b3R5cGUsIHtcclxuXHRtYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9jcmVhdGVNYXRQYXJhbXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdGF0dHJpYnV0ZXM6IHtcclxuXHRcdFx0XHRvZmZzZXQ6XHRcdHsgdHlwZTogJ3YyJywgdmFsdWU6IHRoaXMub2Zmc2V0cyB9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0cmVwZWF0OiAgICAgeyB0eXBlOiAndjInLCB2YWx1ZTogdGhpcy5yZXBlYXQgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHNpemU6XHRcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLnNpemUgfSxcclxuXHRcdFx0XHRzY2FsZTpcdFx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHNpemU7XCIsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgc2NhbGU7XCIsXHJcblx0XHJcblx0XHRcImF0dHJpYnV0ZSB2ZWMyIG9mZnNldDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2YXJ5aW5nIHZlYzIgdk9mZnNldDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIsXHJcblx0XHRcdFwidk9mZnNldCA9IG9mZnNldDtcIixcclxuXHRcdFx0XCJ2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KCBwb3NpdGlvbiwgMS4wICk7XCIsXHJcblxyXG5cdFx0XHRcImdsX1BvaW50U2l6ZSA9IHNpemUgKiAoIHNjYWxlIC8gbGVuZ3RoKCBtdlBvc2l0aW9uLnh5eiApICk7XCIsXHJcblx0XHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcIixcclxuXHRcdFwifVwiLFxyXG5cdF0uam9pbihcIlxcblwiKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0XCJ1bmlmb3JtIHNhbXBsZXIyRCBtYXA7XCIsXHJcblx0XHRcInVuaWZvcm0gdmVjMiByZXBlYXQ7XCIsXHJcblx0XHRcclxuXHRcdFwidmFyeWluZyB2ZWMyIHZPZmZzZXQ7XCIsXHJcblx0XHRcclxuXHRcdFwidm9pZCBtYWluKCkge1wiLFxyXG5cdFx0XHRcInZlYzIgdXYgPSB2ZWMyKCBnbF9Qb2ludENvb3JkLngsIDEuMCAtIGdsX1BvaW50Q29vcmQueSApO1wiLFxyXG5cdFx0XHRcInZlYzQgdGV4ID0gdGV4dHVyZTJEKCBtYXAsIHV2ICogcmVwZWF0ICsgdk9mZnNldCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHRcdCdpZiAoIHRleC5hIDwgQUxQSEFURVNUICkgZGlzY2FyZDsnLFxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdFwiZ2xfRnJhZ0NvbG9yID0gdGV4O1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG59KTsiLCIvLyBtYXAtc2V0dXAuanNcclxuLy8gRGVmaW5lcyBzb21lIG9mIHRoZSBzZXR1cCBmdW5jdGlvbnMgZm9yIE1hcC5qcyBpbiBhIHNlcGFyYXRlIGZpbGUsIGZvciBvcmdhbml6YXRpb25cclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIG1TZXR1cCA9IFxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRcclxuXHRzZXR1cFJpZ2dpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vIFNldHVwIExpZ2h0aW5nIFJpZ2dpbmdcclxuXHRcdHtcclxuXHRcdFx0dmFyIGxpZ2h0ZGVmID0gZXh0ZW5kKHsgXCJkZWZhdWx0XCI6IHRydWUgfSwgdGhpcy5tZXRhZGF0YS5saWdodGluZyk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbGlnaHRzZXR1cCA9IG1TZXR1cC5saWdodGluZ1t0aGlzLm1ldGFkYXRhLmRvbWFpbl07XHJcblx0XHRcdGlmICghbGlnaHRzZXR1cCkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBNYXAgRG9tYWluIVwiLCB0aGlzLm1ldGFkYXRhLmRvbWFpbik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbCA9IGxpZ2h0c2V0dXAuY2FsbCh0aGlzLCBsaWdodGRlZik7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKGwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBTZXR1cCBDYW1lcmEgUmlnZ2luZ1xyXG5cdFx0e1x0Ly8gRm9yIGNhbWVyYSB0eXBlcywgc2VlIHRoZSBDYW1lcmEgdHlwZXMgd2lraSBwYWdlXHJcblx0XHRcdHZhciBjYW1kZWYgPSB0aGlzLm1ldGFkYXRhLmNhbWVyYTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghY2FtZGVmKSB7IHRocm93IG5ldyBFcnJvcihcIk1hcCBjb250YWlucyBubyBzZXR1cCBmb3IgZG9tYWluIVwiKTsgfVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNhbWZuID0gbVNldHVwLmNhbWVyYVtjYW1kZWYudHlwZV07XHJcblx0XHRcdGlmICghY2FtZm4pIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQ2FtZXJhIFR5cGUhXCIsIGNhbWRlZi50eXBlKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBjID0gY2FtZm4uY2FsbCh0aGlzLCBjYW1kZWYpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChjKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Y2FtZXJhIDoge1xyXG5cdFx0b3J0aG8gOiBmdW5jdGlvbihjYW1kZWYpIHtcclxuXHRcdFx0dmFyIHNjcldpZHRoID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0XHRcdHZhciBzY3JIZWlnaHQgPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIk90aHJvZ3JhcGhpYyBDYW1lcmEgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEoc2NyV2lkdGgvLTIsIHNjcldpZHRoLzIsIHNjckhlaWdodC8yLCBzY3JIZWlnaHQvLTIsIDAuMSwgMTUwKTtcclxuXHRcdFx0dGhpcy5jYW1lcmEucG9zaXRpb24ueSA9IDEwMDtcclxuXHRcdFx0dGhpcy5jYW1lcmEucm9hdGlvbi54ID0gLU1hdGguUEkgLyAyO1xyXG5cdFx0XHRub2RlLmFkZCh0aGlzLmNhbWVyYSk7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGdlbjQgOiBmdW5jdGlvbihjYW1kZWYpIHtcclxuXHRcdFx0dmFyIHNjcldpZHRoID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0XHRcdHZhciBzY3JIZWlnaHQgPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIkdlbiA0IENhbWVyYSBSaWdcIjtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBjYW1saXN0ID0gY2FtZGVmW1wiY2FtZXJhc1wiXTtcclxuXHRcdFx0aWYgKCFjYW1saXN0KSB0aHJvdyBuZXcgRXJyb3IoXCJObyBjYW1lcmFzIGRlZmluZWQhXCIpO1xyXG5cdFx0XHRmb3IgKHZhciBjbmFtZSBpbiBjYW1saXN0KSB7XHJcblx0XHRcdFx0dmFyIGMgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNTUsIHNjcldpZHRoIC8gc2NySGVpZ2h0LCAwLjEsIDE1MCk7XHJcblx0XHRcdFx0Yy5uYW1lID0gXCJDYW1lcmEgW1wiK2NuYW1lK1wiXVwiO1xyXG5cdFx0XHRcdGMubXlfY2FtZXJhID0gYztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgY3Jvb3Q7XHJcblx0XHRcdFx0aWYgKCFjYW1saXN0W2NuYW1lXS5maXhlZENhbWVyYSkge1xyXG5cdFx0XHRcdFx0Y3Jvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0XHRcdGNyb290LmFkZChjKTtcclxuXHRcdFx0XHRcdGNyb290Lm15X2NhbWVyYSA9IGM7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBjcCA9IGNhbWxpc3RbY25hbWVdLnBvc2l0aW9uIHx8IFswLCA1LjQ1LCA1LjNdO1xyXG5cdFx0XHRcdGMucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHRcdGMubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuOCwgMCkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBjYiA9IGNhbWxpc3RbY25hbWVdLmJlaGF2aW9yIHx8IFwiZm9sbG93UGxheWVyXCI7XHJcblx0XHRcdFx0dmFyIGNiID0gbVNldHVwLmNhbUJlaGF2aW9yc1tjYl0uY2FsbCh0aGlzLCBjYW1saXN0W2NuYW1lXSwgYywgY3Jvb3QpO1xyXG5cdFx0XHRcdGlmIChjYikge1xyXG5cdFx0XHRcdFx0dGhpcy5jYW1lcmFMb2dpY3MucHVzaChjYik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG5vZGUuYWRkKGNyb290IHx8IGMpO1xyXG5cdFx0XHRcdHRoaXMuY2FtZXJhc1tjbmFtZV0gPSBjO1xyXG5cdFx0XHRcdGlmIChjbmFtZSA9PSAwKSB0aGlzLmNhbWVyYSA9IGM7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmICghdGhpcy5jYW1lcmEpIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbWVyYXMgZGVmaW5lZCFcIik7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgc2NyV2lkdGggLyBzY3JIZWlnaHQsIDEsIDEwMDApO1xyXG5cdFx0XHQvLyB0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gNTtcclxuXHRcdFx0Ly8gdGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IDU7XHJcblx0XHRcdC8vIHRoaXMuY2FtZXJhLnJvdGF0aW9uLnggPSAtNTUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblx0XHRcdC8vVE9ETyBzZXQgdXAgYSBjYW1lcmEgZm9yIGVhY2ggbGF5ZXJcclxuXHRcdFx0Ly8gbm9kZS5hZGQodGhpcy5jYW1lcmEpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRnZW41IDogZnVuY3Rpb24oY2FtZGVmKSB7XHJcblx0XHRcdHZhciBzY3JXaWR0aCA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0XHR2YXIgc2NySGVpZ2h0ID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0bm9kZS5uYW1lID0gXCJHZW4gNSBDYW1lcmEgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgc2NyV2lkdGggLyBzY3JIZWlnaHQsIDAuMSwgMTUwKTtcclxuXHRcdFx0Ly9wYXJzZSB1cCB0aGUgZ2VuIDUgY2FtZXJhIGRlZmluaXRpb25zXHJcblx0XHRcdG5vZGUuYWRkKHRoaXMuY2FtZXJhKTtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fSxcclxuXHR9LFxyXG5cdFxyXG5cdGNhbUJlaGF2aW9ycyA6IHtcclxuXHRcdGZvbGxvd1BsYXllciA6IGZ1bmN0aW9uKGNkZWYsIGNhbSwgY2FtUm9vdCkge1xyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0XHRjYW1Sb290LnBvc2l0aW9uLnNldChwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24pO1xyXG5cdFx0XHRcdC8vVE9ETyBuZWdhdGUgbW92aW5nIHVwIGFuZCBkb3duIHdpdGgganVtcGluZ1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0XHJcblx0bGlnaHRpbmcgOiB7XHJcblx0XHRpbnRlcmlvciA6IGZ1bmN0aW9uKGxpZ2h0ZGVmKSB7XHJcblx0XHRcdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG5vZGUubmFtZSA9IFwiSW50ZXJpb3IgTGlnaHRpbmcgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbGlnaHQ7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KCk7XHJcblx0XHRcdGxpZ2h0LnBvc2l0aW9uLnNldCgwLCA3NSwgMSk7XHJcblx0XHRcdGxpZ2h0LmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHRsaWdodC5vbmx5U2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0bGlnaHQuc2hhZG93RGFya25lc3MgPSAwLjc7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0JpYXMgPSAwLjAwMTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBzaG0gPSBsaWdodGRlZi5zaGFkb3dtYXAgfHwge307XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYU5lYXIgPSBzaG0ubmVhciB8fCAxO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFGYXIgPSBzaG0uZmFyIHx8IDIwMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhVG9wID0gc2htLnRvcCB8fCAzMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhQm90dG9tID0gc2htLmJvdHRvbSB8fCAtMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUxlZnQgPSBzaG0ubGVmdCB8fCAtMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYVJpZ2h0ID0gc2htLnJpZ2h0IHx8IDMwO1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQuc2hhZG93TWFwV2lkdGggPSBzaG0ud2lkdGggfHwgNTEyO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dNYXBIZWlnaHQgPSBzaG0uaGVpZ2h0IHx8IDUxMjtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGxpZ2h0LnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcdFxyXG5cdFx0XHRERUJVRy5fc2hhZG93Q2FtZXJhID0gbGlnaHQ7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgT1JJR0lOID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmZmLCAwLjkpO1xyXG5cdFx0XHRsaWdodC5wb3NpdGlvbi5zZXQoNCwgNCwgNCk7XHJcblx0XHRcdGxpZ2h0Lmxvb2tBdChPUklHSU4pO1xyXG5cdFx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmZmLCAwLjkpO1xyXG5cdFx0XHRsaWdodC5wb3NpdGlvbi5zZXQoLTQsIDQsIDQpO1xyXG5cdFx0XHRsaWdodC5sb29rQXQoT1JJR0lOKTtcclxuXHRcdFx0bm9kZS5hZGQobGlnaHQpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcdC8vdGhpcy5zY2VuZS5hZGQobm9kZSk7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRleHRlcmlvciA6IGZ1bmN0aW9uKGxpZ2h0ZGVmKSB7XHJcblx0XHRcdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG5vZGUubmFtZSA9IFwiRXh0ZXJpb3IgTGlnaHRpbmcgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbGlnaHQ7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KCk7XHJcblx0XHRcdGxpZ2h0LnBvc2l0aW9uLnNldCgtMTAsIDc1LCAtMzApO1xyXG5cdFx0XHRsaWdodC5jYXN0U2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0Ly8gbGlnaHQub25seVNoYWRvdyA9IHRydWU7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0RhcmtuZXNzID0gMC43O1xyXG5cdFx0XHRsaWdodC5zaGFkb3dCaWFzID0gMC4wMDE7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgc2htID0gbGlnaHRkZWYuc2hhZG93bWFwIHx8IHt9O1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFOZWFyID0gc2htLm5lYXIgfHwgMTtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhRmFyID0gc2htLmZhciB8fCAyMDA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYVRvcCA9IHNobS50b3AgfHwgMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUJvdHRvbSA9IHNobS5ib3R0b20gfHwgLTMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFMZWZ0ID0gc2htLmxlZnQgfHwgLTMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFSaWdodCA9IHNobS5yaWdodCB8fCAzMDtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0LnNoYWRvd01hcFdpZHRoID0gc2htLndpZHRoIHx8IDUxMjtcclxuXHRcdFx0bGlnaHQuc2hhZG93TWFwSGVpZ2h0ID0gc2htLmhlaWdodCB8fCA1MTI7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBsaWdodC5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0bm9kZS5hZGQobGlnaHQpO1xyXG5cdFx0XHRcclxuXHRcdFx0REVCVUcuX3NoYWRvd0NhbWVyYSA9IGxpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRoZWxsIDogZnVuY3Rpb24obGlnaHRkZWYpIHtcclxuXHRcdFx0Ly9UT0RPIERvcnJpdG8gRHVuZ2VvblxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdFxyXG5cdGdldERvcml0b0R1bmdlb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBzZXQgdGhpcy5tZXRhZGF0YVxyXG5cdFx0Ly9UT0RPIHNldCB0aGlzLm1hcG1vZGVsXHJcblx0fSxcclxuXHRcclxufSIsIi8vIG10bC1sb2FkZXIuanNcclxuLy8gQSBUSFJFRS5qcyB3YXZlZnJvbnQgTWF0ZXJpYWwgTGlicmFyeSBsb2FkZXJcclxuLy8gQ29waWVkIG1vc3RseSB3aG9sZXNhbGUgZnJvbSB0aGUgdGhyZWUuanMgZXhhbXBsZXMgZm9sZGVyLlxyXG4vLyBPcmlnaW5hbCBhdXRob3JzOiBtcmRvb2IsIGFuZ2VseHVhbmNoYW5nXHJcblxyXG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxuXHJcbmZ1bmN0aW9uIE10bExvYWRlcihtdGxmaWxlLCBsb2FkVGV4dHVyZSwgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm10bGZpbGUgPSBtdGxmaWxlO1xyXG5cdHRoaXMubG9hZFRleHR1cmUgPSBsb2FkVGV4dHVyZTtcclxuXHRcclxuXHR0aGlzLmdjID0gb3B0cy5nYztcclxufVxyXG5pbmhlcml0cyhNdGxMb2FkZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChNdGxMb2FkZXIucHJvdG90eXBlLCB7XHJcblx0bG9hZFRleHR1cmUgOiBudWxsLFxyXG5cdG10bGZpbGUgOiBudWxsLFxyXG5cdFxyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLm10bGZpbGUpIHRocm93IG5ldyBFcnJvcihcIk5vIE1UTCBmaWxlIGdpdmVuIVwiKTtcclxuXHRcdGlmICghdGhpcy5sb2FkVGV4dHVyZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gbG9hZFRleHR1cmUgZnVuY3Rpb24gZ2l2ZW4hXCIpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdFx0dmFyIHBhcnNlZCA9IHNjb3BlLnBhcnNlKHRoaXMubXRsZmlsZSk7XHJcblx0XHR0aGlzLmVtaXQoXCJsb2FkXCIsIHBhcnNlZCk7XHJcblx0fSxcclxuXHRcclxuXHRwYXJzZSA6IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdHZhciBsaW5lcyA9IHRleHQuc3BsaXQoIFwiXFxuXCIgKTtcclxuXHRcdHZhciBpbmZvID0ge307XHJcblx0XHR2YXIgZGVsaW1pdGVyX3BhdHRlcm4gPSAvXFxzKy87XHJcblx0XHR2YXIgbWF0ZXJpYWxzSW5mbyA9IHt9O1xyXG5cdFx0XHJcblx0XHR0cnkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSArKykge1xyXG5cdFx0XHRcdHZhciBsaW5lID0gbGluZXNbaV07XHJcblx0XHRcdFx0bGluZSA9IGxpbmUudHJpbSgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmIChsaW5lLmxlbmd0aCA9PT0gMCB8fCBsaW5lLmNoYXJBdCggMCApID09PSAnIycpIGNvbnRpbnVlOyAvL2lnbm9yZSBibGFuayBsaW5lcyBhbmQgY29tbWVudHNcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBGaW5kIHdoZXJlIHRoZSBmaXJzdCBzcGFjZSBpcyBpbiBhIGxpbmUgYW5kIHNwbGl0IG9mZiBrZXkgYW5kIHZhbHVlIGJhc2VkIG9uIHRoYXRcclxuXHRcdFx0XHR2YXIgcG9zID0gbGluZS5pbmRleE9mKCcgJyk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIGtleSA9IChwb3MgPj0gMCkgPyBsaW5lLnN1YnN0cmluZygwLCBwb3MpIDogbGluZTtcclxuXHRcdFx0XHRrZXkgPSBrZXkudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdmFsdWUgPSAocG9zID49IDApID8gbGluZS5zdWJzdHJpbmcocG9zICsgMSkgOiBcIlwiO1xyXG5cdFx0XHRcdHZhbHVlID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmIChrZXkgPT09IFwibmV3bXRsXCIpIHsgLy8gTmV3IG1hdGVyaWFsIGRlZmluaXRpb25cclxuXHRcdFx0XHRcdGluZm8gPSB7IG5hbWU6IHZhbHVlIH07XHJcblx0XHRcdFx0XHRtYXRlcmlhbHNJbmZvWyB2YWx1ZSBdID0gaW5mbztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGluZm8gKSB7IC8vIElmIHdlIGFyZSB3b3JraW5nIHdpdGggYSBtYXRlcmlhbFxyXG5cdFx0XHRcdFx0aWYgKGtleSA9PT0gXCJrYVwiIHx8IGtleSA9PT0gXCJrZFwiIHx8IGtleSA9PT0gXCJrc1wiKSB7XHJcblx0XHRcdFx0XHRcdHZhciBzcyA9IHZhbHVlLnNwbGl0KGRlbGltaXRlcl9wYXR0ZXJuLCAzKTtcclxuXHRcdFx0XHRcdFx0aW5mb1trZXldID0gW3BhcnNlRmxvYXQoc3NbMF0pLCBwYXJzZUZsb2F0KHNzWzFdKSwgcGFyc2VGbG9hdChzc1syXSldO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0aW5mb1trZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIE9uY2Ugd2UndmUgcGFyc2VkIG91dCBhbGwgdGhlIG1hdGVyaWFscywgbG9hZCB0aGVtIGludG8gYSBcImNyZWF0b3JcIlxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG1hdENyZWF0b3IgPSBuZXcgTWF0ZXJpYWxDcmVhdG9yKHRoaXMubG9hZFRleHR1cmUsIHRoaXMuZ2MpO1xyXG5cdFx0XHRtYXRDcmVhdG9yLnNldE1hdGVyaWFscyhtYXRlcmlhbHNJbmZvKTtcclxuXHRcdFx0cmV0dXJuIG1hdENyZWF0b3I7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcImVycm9yXCIsIGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5cclxuLypcclxuZnVuY3Rpb24gZW5zdXJlUG93ZXJPZlR3b18gKCBpbWFnZSApIHtcclxuXHRpZiAoICEgVEhSRUUuTWF0aC5pc1Bvd2VyT2ZUd28oIGltYWdlLndpZHRoICkgfHwgISBUSFJFRS5NYXRoLmlzUG93ZXJPZlR3byggaW1hZ2UuaGVpZ2h0ICkgKSB7XHJcblx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJjYW52YXNcIiApO1xyXG5cdFx0Y2FudmFzLndpZHRoID0gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggaW1hZ2Uud2lkdGggKTtcclxuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXh0SGlnaGVzdFBvd2VyT2ZUd29fKCBpbWFnZS5oZWlnaHQgKTtcclxuXHRcdFxyXG5cdFx0dmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblx0XHRjdHguZHJhd0ltYWdlKCBpbWFnZSwgMCwgMCwgaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0ICk7XHJcblx0XHRyZXR1cm4gY2FudmFzO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gaW1hZ2U7XHJcbn1cclxuKi9cclxuZnVuY3Rpb24gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggeCApIHtcclxuXHQtLXg7XHJcblx0Zm9yICggdmFyIGkgPSAxOyBpIDwgMzI7IGkgPDw9IDEgKSB7XHJcblx0XHR4ID0geCB8IHggPj4gaTtcclxuXHR9XHJcblx0cmV0dXJuIHggKyAxO1xyXG59XHJcblxyXG5cclxuLy8gVGhlIG9yaWdpbmFsIHZlcnNpb24gY2FtZSB3aXRoIHNldmVyYWwgb3B0aW9ucywgd2hpY2ggd2UgY2FuIHNpbXBseSBhc3N1bWUgd2lsbCBiZSB0aGUgZGVmYXVsdHNcclxuLy9cdFx0c2lkZTogQWx3YXlzIGFwcGx5IHRvIFRIUkVFLkZyb250U2lkZVxyXG4vL1x0XHR3cmFwOiBUaGlzIHdpbGwgYWN0dWFsbHkgYmUgc3BlY2lmaWVkIElOIHRoZSBNVEwsIGJlY2F1c2UgaXQgaGFzIHRoYXQgc3VwcG9ydFxyXG4vL1x0XHRub3JtYWxpemVSR0I6IGZhbHNlIC0gYXNzdW1lZFxyXG4vL1x0XHRpZ25vcmVaZXJvUkdCOiBmYWxzZSBcclxuLy9cdFx0aW52ZXJ0VHJhbnNwYXJlbmN5OiBmYWxzZSAtIGQgPSAxIGlzIG9wYXF1ZVxyXG5mdW5jdGlvbiBNYXRlcmlhbENyZWF0b3IobG9hZFRleHR1cmUsIGdjKSB7XHJcblx0dGhpcy5sb2FkVGV4dHVyZSA9IGxvYWRUZXh0dXJlO1xyXG5cdHRoaXMuZ2MgPSBnYztcclxufVxyXG5NYXRlcmlhbENyZWF0b3IucHJvdG90eXBlID0ge1xyXG5cdHNldE1hdGVyaWFscyA6IGZ1bmN0aW9uKG1hdEluZm8pIHtcclxuXHRcdHRoaXMubWF0ZXJpYWxzSW5mbyA9IG1hdEluZm87XHJcblx0XHR0aGlzLm1hdGVyaWFscyA9IHt9O1xyXG5cdFx0dGhpcy5tYXRlcmlhbHNBcnJheSA9IFtdO1xyXG5cdFx0dGhpcy5uYW1lTG9va3VwID0ge307XHJcblx0fSxcclxuXHRcclxuXHRwcmVsb2FkIDogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBtbiBpbiB0aGlzLm1hdGVyaWFsc0luZm8pIHtcclxuXHRcdFx0dGhpcy5jcmVhdGUobW4pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Z2V0SW5kZXggOiBmdW5jdGlvbihtYXROYW1lKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5uYW1lTG9va3VwW21hdE5hbWVdO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0QXNBcnJheSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGluZGV4ID0gMDtcclxuXHRcdGZvciAodmFyIG1uIGluIHRoaXMubWF0ZXJpYWxzSW5mbykge1xyXG5cdFx0XHR0aGlzLm1hdGVyaWFsc0FycmF5W2luZGV4XSA9IHRoaXMuY3JlYXRlKG1uKTtcclxuXHRcdFx0dGhpcy5uYW1lTG9va3VwW21uXSA9IGluZGV4O1xyXG5cdFx0XHRpbmRleCsrO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzQXJyYXk7XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGUgOiBmdW5jdGlvbiAobWF0TmFtZSkge1xyXG5cdFx0aWYgKHRoaXMubWF0ZXJpYWxzW21hdE5hbWVdID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVNYXRlcmlhbF8obWF0TmFtZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5tYXRlcmlhbHNbbWF0TmFtZV07XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNYXRlcmlhbF8gOiBmdW5jdGlvbihtYXROYW1lKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdFx0dmFyIG1hdCA9IHRoaXMubWF0ZXJpYWxzSW5mb1ttYXROYW1lXTtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdG5hbWU6IG1hdE5hbWUsXHJcblx0XHRcdHNpZGU6IFRIUkVFLkZyb250U2lkZSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGZvciAodmFyIHByb3AgaW4gbWF0KSB7XHJcblx0XHRcdHZhciB2YWx1ZSA9IG1hdFtwcm9wXTtcclxuXHRcdFx0c3dpdGNoIChwcm9wLnRvTG93ZXJDYXNlKCkpIHtcclxuXHRcdFx0XHRjYXNlIFwibmFtZVwiOlxyXG5cdFx0XHRcdFx0cGFyYW1zWyduYW1lJ10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJrZFwiOiAvLyBEaWZmdXNlIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2RpZmZ1c2UnXSA9IG5ldyBUSFJFRS5Db2xvcigpLmZyb21BcnJheSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia2FcIjogLy8gQW1iaWVudCBjb2xvclxyXG5cdFx0XHRcdFx0cGFyYW1zWydhbWJpZW50J10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtzXCI6IC8vIFNwZWN1bGFyIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NwZWN1bGFyJ10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtlXCI6IC8vIEVtaXNzaW9uIChub24tc3RhbmRhcmQpXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2VtaXNzaXZlJ10gPSBuZXcgVEhSRUUuQ29sb3IodmFsdWUsIHZhbHVlLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2tkXCI6IC8vIERpZmZ1c2UgdGV4dHVyZSBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydtYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9rYVwiOiAvLyBBbWJpZW50IHRleHR1cmUgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snbGlnaHRNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfa3NcIjogLy8gU3BlY3VsYXIgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snc3BlY3VsYXJNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfZFwiOiAvLyBBbHBoYSB0ZXh0dXJlIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2FscGhhTWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiYnVtcFwiOlxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfYnVtcFwiOiAvLyBCdW1wIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2J1bXBNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYgKGFyZ3MuYm0pIHBhcmFtc1snYnVtcFNjYWxlJ10gPSBhcmdzLmJtO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm5zXCI6IC8vIFNwZWN1bGFyIGV4cG9uZW50XHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NoaW5pbmVzcyddID0gdmFsdWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiZFwiOiAvLyBUcmFuc3BhcmVuY3lcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA8IDEpIHtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWyd0cmFuc3BhcmVudCddID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydvcGFjaXR5J10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydhbHBoYVRlc3QnXSA9IDAuMDU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIlVuaGFuZGxlZCBNVEwgZGF0YTpcIiwgcHJvcCwgXCI9XCIsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICggcGFyYW1zWyAnZGlmZnVzZScgXSApIHtcclxuXHRcdFx0aWYgKCAhcGFyYW1zWyAnYW1iaWVudCcgXSkgcGFyYW1zWyAnYW1iaWVudCcgXSA9IHBhcmFtc1sgJ2RpZmZ1c2UnIF07XHJcblx0XHRcdHBhcmFtc1sgJ2NvbG9yJyBdID0gcGFyYW1zWyAnZGlmZnVzZScgXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5tYXRlcmlhbHNbIG1hdE5hbWUgXSA9IG5ldyBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbCggcGFyYW1zICk7XHJcblx0XHRzY29wZS5nYy5jb2xsZWN0KCB0aGlzLm1hdGVyaWFsc1ttYXROYW1lXSApO1xyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzWyBtYXROYW1lIF07XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX190ZXh0dXJlTWFwKGFyZ3MpIHtcclxuXHRcdFx0aWYgKGFyZ3MudGltZUFwcGxpY2FibGUpIHtcclxuXHRcdFx0XHR2YXIgbm93ID0gbW9tZW50KCk7XHJcblx0XHRcdFx0aWYgKG1vbWVudC5pc0JlZm9yZShhcmdzLnRpbWVBcHBsaWNhYmxlWzBdKSB8fCBtb21lbnQuaXNBZnRlcihhcmdzLnRpbWVBcHBsaWNhYmxlWzFdKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7IC8vSWdub3JlIHRoaXMgbWFwLCBpZiB0aW1lIGlzIG5vdCBhcHBsaWNhYmxlIHRvIGl0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gaGFuZGxlIGN1Ym1hcHMhIG5ldyBUSFJFRS5UZXh0dXJlKFtzZXQgb2YgNiBpbWFnZXNdKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVE9ETyBsb29rIGludG8gaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9UZXh0dXJlcy9Db21wcmVzc2VkVGV4dHVyZVxyXG5cdFx0XHQvLyBVc2luZyBcIi5kZHNcIiBmb3JtYXQ/XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0aW1hZ2Uuc3JjID0gREVGX1RFWFRVUkU7XHJcblx0XHRcdHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoaW1hZ2UpO1xyXG5cdFx0XHR0ZXh0dXJlLm5hbWUgPSBhcmdzLnNyYztcclxuXHRcdFx0c2NvcGUuZ2MuY29sbGVjdCh0ZXh0dXJlKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ1JFQVRFIElNRzogXCIsIGFyZ3Muc3JjKTtcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZyhcIk1UTF9cIithcmdzLnNyYyk7XHJcblx0XHRcdHNjb3BlLmxvYWRUZXh0dXJlKGFyZ3Muc3JjLCBmdW5jdGlvbih1cmwpe1xyXG5cdFx0XHRcdC8vIEV2ZW4gdGhvdWdoIHRoZSBpbWFnZXMgYXJlIGluIG1lbW9yeSwgYXBwYXJlbnRseSB0aGV5IHN0aWxsIGFyZW4ndCBcImxvYWRlZFwiXHJcblx0XHRcdFx0Ly8gYXQgdGhlIHBvaW50IHdoZW4gdGhleSBhcmUgYXNzaWduZWQgdG8gdGhlIHNyYyBhdHRyaWJ1dGUuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJGSU5JU0ggQ1JFQVRFIElNRzogXCIsIGFyZ3Muc3JjKTtcclxuXHRcdFx0XHRpbWFnZS5vbihcImxvYWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiTVRMX1wiK2FyZ3Muc3JjKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpbWFnZS5zcmMgPSB1cmw7XHJcblx0XHRcdFx0Ly8gaW1hZ2UgPSBlbnN1cmVQb3dlck9mVHdvXyggaW1hZ2UgKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1hZ2U7XHJcblx0XHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFx0XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFhcmdzLmNsYW1wKSB7IC8vdW5kZWZpbmVkIG9yIGZhbHNlXHJcblx0XHRcdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RNaXBNYXBMaW5lYXJGaWx0ZXI7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoYXJnc1snb191J10gfHwgYXJnc1snb192J10pIHtcclxuXHRcdFx0XHR0ZXh0dXJlLm9mZnNldCA9IG5ldyBWZWN0b3IyKGFyZ3NbJ29fdSddIHx8IDAsIGFyZ3NbJ29fdiddIHx8IDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0ZXh0dXJlLmFuaXNvdHJvcHkgPSAxNjtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3NwbGl0VGV4QXJnKGFyZykge1xyXG5cdFx0XHR2YXIgY29tcHMgPSBhcmcuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHR2YXIgdGV4RGVmID0ge307XHJcblx0XHRcdC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2F2ZWZyb250Xy5vYmpfZmlsZSNUZXh0dXJlX29wdGlvbnNcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHN3aXRjaCAoY29tcHNbaV0pIHtcclxuXHRcdFx0XHRcdGNhc2UgXCItYmxlbmR1XCI6IFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJibGVuZHVcIl0gPSAoY29tcHNbaSsxXSAhPSBcIm9mZlwiKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhazsgLy9jb25zdW1lIHRoZSBhcmd1bWVudFxyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ibGVuZHZcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYmxlbmR2XCJdID0gKGNvbXBzW2krMV0gIT0gXCJvZmZcIik7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJvb3N0XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJvb3N0XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItbW1cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wibW1fYmFzZVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm1tX2dhaW5cIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1vXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wib193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1zXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wic193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widF93XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10ZXhyZXNcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widGV4cmVzXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItY2xhbXBcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiY2xhbXBcIl0gPSAoY29tcHNbaSsxXSA9PSBcIm9uXCIpOyAvL2RlZmF1bHQgb2ZmXHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJtXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJtXCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItaW1mY2hhblwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJpbWZjaGFuXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItdHlwZVwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0eXBlXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gQ3VzdG9tIHByb3BlcnRpZXNcclxuXHRcdFx0XHRcdGNhc2UgXCItdGltZWFwcFwiOiAgLy9UaW1lIGFwcGxpY2FibGVcclxuXHRcdFx0XHRcdFx0Ly8gLXRpbWVhcHAgW3N0YXJ0VGltZV0gW2VuZFRpbWVdXHJcblx0XHRcdFx0XHRcdC8vICAgd2hlcmUgdGhlIHRpbWVzIGFyZSBmb3JtYXR0ZWQgYXMgZm9sbG93czogbTAwW2QwMFtoMDBbbTAwXV1dXHJcblx0XHRcdFx0XHRcdC8vICAgZWFjaCBzZWN0aW9uIGluIHNlcXVlbmNlIGlzIG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdC8vIHN0YXJ0VGltZSA9IHN0YXJ0IG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHQvLyBlbmRUaW1lID0gZW5kIG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHR2YXIgc3RhcnRUaW1lID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0dmFyIGVuZFRpbWUgPSBjb21wc1tpKzJdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQvL3RleERlZltcInRpbWVhcHBcIl0gPSBbY29tcHNbaSsxXSwgY29tcHNbaSsyXV07XHJcblx0XHRcdFx0XHRcdHZhciBzdCwgZW5kO1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIHJlcyA9IC9tKFxcZFxcZCkoPzpkKFxcZFxcZCkoPzpoKFxcZFxcZCkoPzptKFxcZFxcZCkpPyk/KT8vaS5leGVjKHN0YXJ0VGltZSk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFyZXMpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGltZXN0YW1wIGZvciAtdGltZWFwcCBzdGFydFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0c3QgPSBtb21lbnQoKS5tb250aChyZXNbMV0pLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzJdKSB7IHN0LmRhdGUocmVzWzJdKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgc3QuaG91cihyZXNbM10pOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1s0XSkgeyBzdC5taW51dGUocmVzWzRdKTsgfVxyXG5cdFx0XHRcdFx0XHR9e1xyXG5cdFx0XHRcdFx0XHRcdHZhciByZXMgPSAvbShcXGRcXGQpKD86ZChcXGRcXGQpKD86aChcXGRcXGQpKD86bShcXGRcXGQpKT8pPyk/L2kuZXhlYyhlbmRUaW1lKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXJlcykgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aW1lc3RhbXAgZm9yIC10aW1lYXBwIGVuZFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0ZW5kID0gbW9tZW50KCkubW9udGgocmVzWzFdKS5lbmRPZihcIm1vbnRoXCIpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbMl0pIHsgZW5kLmRhdGUocmVzWzJdKS5lbmRPZihcImRheVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgZW5kLmhvdXIocmVzWzNdKS5lbmRPZihcImhvdXJcIik7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzRdKSB7IGVuZC5taW51dGUocmVzWzRdKS5lbmRPZihcIm1pbnV0ZVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGlmIChlbmQuaXNCZWZvcmUoc3QpKSBlbmQuYWRkKDEsIFwieWVhclwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0aW1lQXBwbGljYWJsZVwiXSA9IFtzdCwgZW5kXTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHQvL0Fzc3VtZSB0aGUgc291cmNlIGlzIHRoZSBsYXN0IHRoaW5nIHdlJ2xsIGZpbmRcclxuXHRcdFx0XHRcdFx0dGV4RGVmLnNyYyA9IGNvbXBzLnNsaWNlKGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWYuYXJncyA9IGNvbXBzLnNsaWNlKDAsIGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0fVxyXG5cdH0sXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE10bExvYWRlcjtcclxuIiwiLy8gb2JqLWxvYWRlci5qc1xyXG4vLyBBIFRIUkVFLmpzIHdhdmVmcm9udCBvYmplY3QgbG9hZGVyXHJcbi8vIENvcGllZCBtb3N0bHkgd2hvbGVzYWxlIGZyb20gdGhlIHRocmVlLmpzIGV4YW1wbGVzIGZvbGRlci5cclxuLy8gT3JpZ2luYWwgYXV0aG9yczogbXJkb29iLCBhbmdlbHh1YW5jaGFuZ1xyXG5cclxudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbnZhciBNdGxMb2FkZXIgPSByZXF1aXJlKFwiLi9tdGwtbG9hZGVyXCIpO1xyXG5cclxuZnVuY3Rpb24gT2JqTG9hZGVyKG9iamZpbGUsIG10bGZpbGUsIGZpbGVTeXMsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vYmpmaWxlID0gb2JqZmlsZTtcclxuXHR0aGlzLm10bGZpbGUgPSBtdGxmaWxlO1xyXG5cdHRoaXMuZmlsZVN5cyA9IGZpbGVTeXM7XHJcblx0XHJcblx0aWYgKG9wdHMuZ2MpIHtcclxuXHRcdGlmICh0eXBlb2Ygb3B0cy5nYyA9PSBcInN0cmluZ1wiKVxyXG5cdFx0XHR0aGlzLmdjID0gR0MuZ2V0QmluKG9wdHMuZ2MpO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLmdjID0gb3B0cy5nYztcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhpcy5nYyA9IEdDLmdldEJpbigpO1xyXG5cdH1cclxuXHRcclxufTtcclxuaW5oZXJpdHMoT2JqTG9hZGVyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoT2JqTG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdG9iamZpbGUgOiBudWxsLFxyXG5cdG10bGZpbGUgOiBudWxsLFxyXG5cdGZpbGVTeXMgOiBudWxsLFxyXG5cdFxyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCEodGhpcy5vYmpmaWxlICYmIHRoaXMubXRsZmlsZSkpIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBPQkogZmlsZSBvciBNVEwgZmlsZSBnaXZlbiFcIik7XHJcblx0XHRcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHR2YXIgbXRsTG9hZGVyID0gbmV3IE10bExvYWRlcih0aGlzLm10bGZpbGUsIHRoaXMuZmlsZVN5cywge1xyXG5cdFx0XHRcImdjXCI6IHRoaXMuZ2MsXHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5vbihcImxvYWRcIiwgZnVuY3Rpb24obWF0TGliKSB7XHJcblx0XHRcdFxyXG5cdFx0XHRtYXRMaWIucHJlbG9hZCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG9iamVjdCA9IHNjb3BlLnBhcnNlKHNjb3BlLm9iamZpbGUpO1xyXG5cdFx0XHRvYmplY3QudHJhdmVyc2UoZnVuY3Rpb24ob2JqZWN0KXtcclxuXHRcdFx0XHRpZiAob2JqZWN0IGluc3RhbmNlb2YgVEhSRUUuTWVzaCkge1xyXG5cdFx0XHRcdFx0aWYgKG9iamVjdC5tYXRlcmlhbC5uYW1lKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtYXQgPSBtYXRMaWIuY3JlYXRlKG9iamVjdC5tYXRlcmlhbC5uYW1lKTtcclxuXHRcdFx0XHRcdFx0aWYgKG1hdCkgb2JqZWN0Lm1hdGVyaWFsID0gbWF0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0b2JqZWN0LnJlY2VpdmVTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdG9iamVjdC5uYW1lID0gXCJMb2FkZWQgTWVzaFwiO1xyXG5cdFx0XHRcclxuXHRcdFx0c2NvcGUuZW1pdChcImxvYWRcIiwgb2JqZWN0KTtcclxuXHRcdH0pO1xyXG5cdFx0bXRsTG9hZGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdHNjb3BlLmVtaXQoXCJlcnJvclwiLCBlKTtcclxuXHRcdH0pO1xyXG5cdFx0bXRsTG9hZGVyLmxvYWQoKTtcclxuXHR9LFxyXG59KTtcclxuXHJcbi8vVGhlc2Ugd291bGQgYmUgQ09OU1RTIGluIG5vZGUuanMsIGJ1dCB3ZSdyZSBpbiB0aGUgYnJvd3NlciBub3c6XHJcblxyXG4vLyB2IGZsb2F0IGZsb2F0IGZsb2F0XHJcbnZhciBWRVJURVhfUEFUVEVSTiA9IC92KCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspLztcclxuXHJcbi8vIHZuIGZsb2F0IGZsb2F0IGZsb2F0XHJcbnZhciBOT1JNQUxfUEFUVEVSTiA9IC92biggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyB2dCBmbG9hdCBmbG9hdFxyXG52YXIgVVZfUEFUVEVSTiA9IC92dCggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyBmIHZlcnRleCB2ZXJ0ZXggdmVydGV4IC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMSA9IC9mKCArXFxkKykoICtcXGQrKSggK1xcZCspKCArXFxkKyk/LztcclxuXHJcbi8vIGYgdmVydGV4L3V2IHZlcnRleC91diB2ZXJ0ZXgvdXYgLi4uXHJcbnZhciBGQUNFX1BBVFRFUk4yID0gL2YoICsoXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKykpPy87XHJcblxyXG4vLyBmIHZlcnRleC91di9ub3JtYWwgdmVydGV4L3V2L25vcm1hbCB2ZXJ0ZXgvdXYvbm9ybWFsIC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMyA9IC9mKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKT8vO1xyXG5cclxuLy8gZiB2ZXJ0ZXgvL25vcm1hbCB2ZXJ0ZXgvL25vcm1hbCB2ZXJ0ZXgvL25vcm1hbCAuLi4gXHJcbnZhciBGQUNFX1BBVFRFUk40ID0gL2YoICsoXFxkKylcXC9cXC8oXFxkKykpKCArKFxcZCspXFwvXFwvKFxcZCspKSggKyhcXGQrKVxcL1xcLyhcXGQrKSkoICsoXFxkKylcXC9cXC8oXFxkKykpPy9cclxuXHJcblxyXG5PYmpMb2FkZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHRcclxuXHR2YXIgZmFjZV9vZmZzZXQgPSAwO1xyXG5cdFxyXG5cdHZhciBncm91cCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdHZhciBvYmplY3QgPSBncm91cDtcclxuXHRcclxuXHR2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHR2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCgpO1xyXG5cdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goIGdlb21ldHJ5LCBtYXRlcmlhbCApO1xyXG5cdFxyXG5cdHZhciB2ZXJ0aWNlcyA9IFtdO1xyXG5cdHZhciB2ZXJ0aWNlc0NvdW50ID0gMDtcclxuXHR2YXIgbm9ybWFscyA9IFtdO1xyXG5cdHZhciB1dnMgPSBbXTtcclxuXHRcclxuXHQvL0JlZ2luIHBhcnNpbmcgaGVyZVxyXG5cclxuXHR2YXIgbGluZXMgPSBkYXRhLnNwbGl0KCBcIlxcblwiICk7XHJcblx0Zm9yICggdmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICsrICkge1xyXG5cdFx0dmFyIGxpbmUgPSBsaW5lc1sgaSBdO1xyXG5cdFx0bGluZSA9IGxpbmUudHJpbSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgcmVzdWx0O1xyXG5cdFx0XHJcblx0XHRpZiAobGluZS5sZW5ndGggPT0gMCB8fCBsaW5lLmNoYXJBdCgwKSA9PSBcIiNcIikgXHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0ZWxzZSBcclxuXHRcdGlmICgocmVzdWx0ID0gVkVSVEVYX1BBVFRFUk4uZXhlYyhsaW5lKSkgIT09IG51bGwpIHtcclxuXHRcdFx0Ly8gW1widiAxLjAgMi4wIDMuMFwiLCBcIjEuMFwiLCBcIjIuMFwiLCBcIjMuMFwiXVxyXG5cdFx0XHR2ZXJ0aWNlcy5wdXNoKHZlY3RvcihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMyBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBOT1JNQUxfUEFUVEVSTi5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1widm4gMS4wIDIuMCAzLjBcIiwgXCIxLjBcIiwgXCIyLjBcIiwgXCIzLjBcIl1cclxuXHRcdFx0bm9ybWFscy5wdXNoKHZlY3RvcihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMyBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBVVl9QQVRURVJOLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJ2dCAwLjEgMC4yXCIsIFwiMC4xXCIsIFwiMC4yXCJdXHJcblx0XHRcdHV2cy5wdXNoKHV2KFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAxIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAyIF0pXHJcblx0XHRcdCkpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjEuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMSAyIDNcIiwgXCIxXCIsIFwiMlwiLCBcIjNcIiwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFsgcmVzdWx0WyAxIF0sIHJlc3VsdFsgMiBdLCByZXN1bHRbIDMgXSwgcmVzdWx0WyA0IF0gXSk7XHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjIuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8xIDIvMiAzLzNcIiwgXCIgMS8xXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8yXCIsIFwiMlwiLCBcIjJcIiwgXCIgMy8zXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShcclxuXHRcdFx0XHRbIHJlc3VsdFsgMiBdLCByZXN1bHRbIDUgXSwgcmVzdWx0WyA4IF0sIHJlc3VsdFsgMTEgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgOSBdLCByZXN1bHRbIDEyIF0gXSAvL3V2XHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJOMy5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxLzEvMSAyLzIvMiAzLzMvM1wiLCBcIiAxLzEvMVwiLCBcIjFcIiwgXCIxXCIsIFwiMVwiLCBcIiAyLzIvMlwiLCBcIjJcIiwgXCIyXCIsIFwiMlwiLCBcIiAzLzMvM1wiLCBcIjNcIiwgXCIzXCIsIFwiM1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoXHJcblx0XHRcdFx0WyByZXN1bHRbIDIgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgMTAgXSwgcmVzdWx0WyAxNCBdIF0sIC8vZmFjZXNcclxuXHRcdFx0XHRbIHJlc3VsdFsgMyBdLCByZXN1bHRbIDcgXSwgcmVzdWx0WyAxMSBdLCByZXN1bHRbIDE1IF0gXSwgLy91dlxyXG5cdFx0XHRcdFsgcmVzdWx0WyA0IF0sIHJlc3VsdFsgOCBdLCByZXN1bHRbIDEyIF0sIHJlc3VsdFsgMTYgXSBdIC8vbm9ybWFsXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJONC5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxLy8xIDIvLzIgMy8vM1wiLCBcIiAxLy8xXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8vMlwiLCBcIjJcIiwgXCIyXCIsIFwiIDMvLzNcIiwgXCIzXCIsIFwiM1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFxyXG5cdFx0XHRcdFsgcmVzdWx0WyAyIF0sIHJlc3VsdFsgNSBdLCByZXN1bHRbIDggXSwgcmVzdWx0WyAxMSBdIF0sIC8vZmFjZXNcclxuXHRcdFx0XHRbIF0sIC8vdXZcclxuXHRcdFx0XHRbIHJlc3VsdFsgMyBdLCByZXN1bHRbIDYgXSwgcmVzdWx0WyA5IF0sIHJlc3VsdFsgMTIgXSBdIC8vbm9ybWFsXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICggL15vIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBvYmplY3RcclxuXHRcdFx0bWVzaE4oKTtcclxuXHRcdFx0ZmFjZV9vZmZzZXQgPSBmYWNlX29mZnNldCArIHZlcnRpY2VzLmxlbmd0aDtcclxuXHRcdFx0dmVydGljZXMgPSBbXTtcclxuXHRcdFx0b2JqZWN0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG9iamVjdC5uYW1lID0gbGluZS5zdWJzdHJpbmcoIDIgKS50cmltKCk7XHJcblx0XHRcdGdyb3VwLmFkZCggb2JqZWN0ICk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoIC9eZyAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gZ3JvdXBcclxuXHRcdFx0Ly8gbWVzaE4oIGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpLCB1bmRlZmluZWQgKTtcclxuXHRcdFx0bWVzaC5uYW1lID0gbGluZS5zdWJzdHJpbmcoIDIgKS50cmltKCk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKCAvXnVzZW10bCAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gbWF0ZXJpYWxcclxuXHRcdFx0bWVzaE4oIHVuZGVmaW5lZCwgbGluZS5zdWJzdHJpbmcoIDcgKS50cmltKCkgKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHRcdFx0Ly8gbWF0ZXJpYWwubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCA3ICkudHJpbSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbWVzaC5tYXRlcmlhbCA9IG1hdGVyaWFsO1xyXG5cclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL15tdGxsaWIgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIG10bCBmaWxlXHJcblx0XHRcdC8vIGlmICggbXRsbGliQ2FsbGJhY2sgKSB7XHJcblx0XHRcdC8vIFx0dmFyIG10bGZpbGUgPSBsaW5lLnN1YnN0cmluZyggNyApO1xyXG5cdFx0XHQvLyBcdG10bGZpbGUgPSBtdGxmaWxlLnRyaW0oKTtcclxuXHRcdFx0Ly8gXHRtdGxsaWJDYWxsYmFjayggbXRsZmlsZSApO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKCAvXnMgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIFNtb290aCBzaGFkaW5nXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZyggXCJUSFJFRS5PQkpNVExMb2FkZXI6IFVuaGFuZGxlZCBsaW5lIFwiICsgbGluZSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRtZXNoTih1bmRlZmluZWQsIHVuZGVmaW5lZCk7IC8vQWRkIGxhc3Qgb2JqZWN0XHJcblx0cmV0dXJuIGdyb3VwO1xyXG5cclxuXHJcblx0ZnVuY3Rpb24gbWVzaE4oIG1lc2hOYW1lLCBtYXRlcmlhbE5hbWUgKSB7XHJcblx0XHRpZiAoIHZlcnRpY2VzLmxlbmd0aCA+IDAgJiYgZ2VvbWV0cnkuZmFjZXMubGVuZ3RoID4gMCApIHtcclxuXHRcdFx0Z2VvbWV0cnkudmVydGljZXMgPSB2ZXJ0aWNlcztcclxuXHRcdFx0XHJcblx0XHRcdGdlb21ldHJ5Lm1lcmdlVmVydGljZXMoKTtcclxuXHRcdFx0Z2VvbWV0cnkuY29tcHV0ZUZhY2VOb3JtYWxzKCk7XHJcblx0XHRcdGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xyXG5cdFx0XHRnZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtcclxuXHRcdFx0XHJcblx0XHRcdG9iamVjdC5hZGQoIG1lc2ggKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuZ2MuY29sbGVjdChnZW9tZXRyeSk7XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0XHRtZXNoID0gbmV3IFRIUkVFLk1lc2goIGdlb21ldHJ5LCBtYXRlcmlhbCApO1xyXG5cdFx0XHR2ZXJ0aWNlc0NvdW50ID0gMDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gaWYgKCBtZXNoTmFtZSAhPT0gdW5kZWZpbmVkICkgbWVzaC5uYW1lID0gbWVzaE5hbWU7XHJcblx0XHRcclxuXHRcdGlmICggbWF0ZXJpYWxOYW1lICE9PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHRcdFx0bWF0ZXJpYWwubmFtZSA9IG1hdGVyaWFsTmFtZTtcclxuXHRcdFx0XHJcblx0XHRcdG1lc2gubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gYWRkX2ZhY2UoIGEsIGIsIGMsIG5vcm1hbHNfaW5kcyApIHtcclxuXHRcdGlmICggbm9ybWFsc19pbmRzID09PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdGdlb21ldHJ5LmZhY2VzLnB1c2goIGZhY2UzKFxyXG5cdFx0XHRcdHBhcnNlSW50KCBhICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYiApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGMgKSAtIChmYWNlX29mZnNldCArIDEpXHJcblx0XHRcdCkgKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGdlb21ldHJ5LmZhY2VzLnB1c2goIGZhY2UzKFxyXG5cdFx0XHRcdHBhcnNlSW50KCBhICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYiApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGMgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdG5vcm1hbHNbIHBhcnNlSW50KCBub3JtYWxzX2luZHNbIDAgXSApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdFx0XHRub3JtYWxzWyBwYXJzZUludCggbm9ybWFsc19pbmRzWyAxIF0gKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHRcdFx0bm9ybWFsc1sgcGFyc2VJbnQoIG5vcm1hbHNfaW5kc1sgMiBdICkgLSAxIF0uY2xvbmUoKVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0KSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRmdW5jdGlvbiBhZGRfdXZzKCBhLCBiLCBjICkge1xyXG5cdFx0Z2VvbWV0cnkuZmFjZVZlcnRleFV2c1sgMCBdLnB1c2goIFtcclxuXHRcdFx0dXZzWyBwYXJzZUludCggYSApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdHV2c1sgcGFyc2VJbnQoIGIgKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHR1dnNbIHBhcnNlSW50KCBjICkgLSAxIF0uY2xvbmUoKVxyXG5cdFx0XSApO1xyXG5cdH1cclxuXHRcclxuXHRmdW5jdGlvbiBoYW5kbGVfZmFjZV9saW5lKGZhY2VzLCB1dnMsIG5vcm1hbHNfaW5kcykge1xyXG5cdFx0aWYgKCBmYWNlc1sgMyBdID09PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMiBdLCBub3JtYWxzX2luZHMgKTtcclxuXHRcdFx0aWYgKCEodXZzID09PSB1bmRlZmluZWQpICYmIHV2cy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWRkX3V2cyggdXZzWyAwIF0sIHV2c1sgMSBdLCB1dnNbIDIgXSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKCEobm9ybWFsc19pbmRzID09PSB1bmRlZmluZWQpICYmIG5vcm1hbHNfaW5kcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAwIF0sIGZhY2VzWyAxIF0sIGZhY2VzWyAzIF0sIFsgbm9ybWFsc19pbmRzWyAwIF0sIG5vcm1hbHNfaW5kc1sgMSBdLCBub3JtYWxzX2luZHNbIDMgXSBdKTtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgZmFjZXNbIDMgXSwgWyBub3JtYWxzX2luZHNbIDEgXSwgbm9ybWFsc19pbmRzWyAyIF0sIG5vcm1hbHNfaW5kc1sgMyBdIF0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMyBdKTtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgZmFjZXNbIDMgXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdGlmICghKHV2cyA9PT0gdW5kZWZpbmVkKSAmJiB1dnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF91dnMoIHV2c1sgMCBdLCB1dnNbIDEgXSwgdXZzWyAzIF0gKTtcclxuXHRcdFx0XHRhZGRfdXZzKCB1dnNbIDEgXSwgdXZzWyAyIF0sIHV2c1sgMyBdICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG4vL2NvbnZpZW5jZSBmdW5jdGlvbnNcclxuZnVuY3Rpb24gdmVjdG9yKCB4LCB5LCB6ICkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoIHgsIHksIHogKTsgfVxyXG5mdW5jdGlvbiB1diggdSwgdiApIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKCB1LCB2ICk7IH1cclxuZnVuY3Rpb24gZmFjZTMoIGEsIGIsIGMsIG5vcm1hbHMgKSB7IHJldHVybiBuZXcgVEhSRUUuRmFjZTMoIGEsIGIsIGMsIG5vcm1hbHMgKTsgfVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT2JqTG9hZGVyOyIsIi8vIHJlbmRlcmxvb3AuanNcclxuLy8gVGhlIG1vZHVsZSB0aGF0IGhhbmRsZXMgYWxsIHRoZSBjb21tb24gY29kZSB0byByZW5kZXIgYW5kIGRvIGdhbWUgdGlja3Mgb24gYSBtYXBcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgcmFmID0gcmVxdWlyZShcInJhZlwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRzdGFydCA6IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHRcdC8vIFNldCB0aGUgY2FudmFzJ3MgYXR0cmlidXRlcywgYmVjYXVzZSB0aG9zZSBcclxuXHRcdC8vIEFDVFVBTExZIGRldGVybWluZSBob3cgYmlnIHRoZSByZW5kZXJpbmcgYXJlYSBpcy5cclxuXHRcdGlmICghb3B0cy5fZGlzYWJsZVRyZWUpIHtcclxuXHRcdFx0dmFyIGNhbnZhcyA9ICQoXCIjZ2FtZXNjcmVlblwiKTtcclxuXHRcdFx0Y2FudmFzLmF0dHIoXCJ3aWR0aFwiLCBwYXJzZUludChjYW52YXMuY3NzKFwid2lkdGhcIikpKTtcclxuXHRcdFx0Y2FudmFzLmF0dHIoXCJoZWlnaHRcIiwgcGFyc2VJbnQoY2FudmFzLmNzcyhcImhlaWdodFwiKSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHRcdFx0Y2xlYXJDb2xvciA6IDB4MDAwMDAwLFxyXG5cdFx0XHRcdHRpY2tzUGVyU2Vjb25kIDogMzAsXHJcblx0XHRcdH0sIG9wdHMpO1xyXG5cdFx0XHRcclxuXHRcdFx0d2luZG93LnRocmVlUmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7XHJcblx0XHRcdFx0YW50aWFsaWFzIDogdHJ1ZSxcclxuXHRcdFx0XHRjYW52YXMgOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdhbWVzY3JlZW5cIikgXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLnNldENsZWFyQ29sb3JIZXgoIG9wdHMuY2xlYXJDb2xvciApO1xyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLmF1dG9DbGVhciA9IGZhbHNlO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zaGFkb3dNYXBUeXBlID0gVEhSRUUuUENGU2hhZG93TWFwO1xyXG5cdFx0XHRcclxuXHRcdFx0X3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aW5pdEdhbWVMb29wKDMwKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0cGF1c2UgOiBmdW5jdGlvbigpIHtcclxuXHRcdHBhdXNlZCA9IHRydWU7XHJcblx0XHQvLyBfcmVuZGVySGFuZGxlID0gbnVsbDtcclxuXHR9LFxyXG5cdHVucGF1c2UgOiBmdW5jdGlvbigpIHtcclxuXHRcdHBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0Ly8gX3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxuXHR9LFxyXG59O1xyXG5cclxuXHJcbnZhciBfcmVuZGVySGFuZGxlOyBcclxuZnVuY3Rpb24gcmVuZGVyTG9vcCgpIHtcclxuXHR0aHJlZVJlbmRlcmVyLmNsZWFyKCk7XHJcblx0XHJcblx0aWYgKGN1cnJlbnRNYXAgJiYgY3VycmVudE1hcC5zY2VuZSAmJiBjdXJyZW50TWFwLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgd2l0aCB0aGUgbWFwJ3MgYWN0aXZlIGNhbWVyYSBvbiBpdHMgYWN0aXZlIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihjdXJyZW50TWFwLnNjZW5lLCBjdXJyZW50TWFwLmNhbWVyYSk7XHJcblx0fVxyXG5cdFxyXG5cdGlmIChVSS5zY2VuZSAmJiBVSS5jYW1lcmEpIHtcclxuXHRcdC8vUmVuZGVyIHRoZSBVSSB3aXRoIHRoZSBVSSBjYW1lcmEgYW5kIGl0cyBzY2VuZVxyXG5cdFx0dGhyZWVSZW5kZXJlci5jbGVhcihmYWxzZSwgdHJ1ZSwgZmFsc2UpOyAvL0NsZWFyIGRlcHRoIGJ1ZmZlclxyXG5cdFx0dGhyZWVSZW5kZXJlci5yZW5kZXIoVUkuc2NlbmUsIFVJLmNhbWVyYSk7XHJcblx0fVxyXG5cdFxyXG5cdGlmIChfcmVuZGVySGFuZGxlKVxyXG5cdFx0X3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxufVxyXG5cclxudmFyIHBhdXNlZCA9IGZhbHNlO1xyXG5mdW5jdGlvbiBpbml0R2FtZUxvb3AodGlja3NQZXJTZWMpIHtcclxuXHRfcmF0ZSA9IDEwMDAgLyB0aWNrc1BlclNlYztcclxuXHRcclxuXHR2YXIgYWNjdW0gPSAwO1xyXG5cdHZhciBub3cgPSAwO1xyXG5cdHZhciBsYXN0ID0gbnVsbDtcclxuXHR2YXIgZHQgPSAwO1xyXG5cdHZhciB3aG9sZVRpY2s7XHJcblx0XHJcblx0c2V0SW50ZXJ2YWwodGltZXJUaWNrLCAwKTtcclxuXHRcclxuXHRmdW5jdGlvbiB0aW1lclRpY2soKSB7XHJcblx0XHRpZiAocGF1c2VkKSB7XHJcblx0XHRcdGxhc3QgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRhY2N1bSA9IDA7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGR0ID0gbm93IC0gKGxhc3QgfHwgbm93KTtcclxuXHRcdGxhc3QgPSBub3c7XHJcblx0XHRhY2N1bSArPSBkdDtcclxuXHRcdGlmIChhY2N1bSA8IF9yYXRlKSByZXR1cm47XHJcblx0XHR3aG9sZVRpY2sgPSAoKGFjY3VtIC8gX3JhdGUpfDApO1xyXG5cdFx0aWYgKHdob2xlVGljayA8PSAwKSByZXR1cm47XHJcblx0XHR3aG9sZVRpY2sgKj0gX3JhdGU7XHJcblx0XHRcclxuXHRcdHZhciBkZWx0YSA9IHdob2xlVGljayAqIDAuMDE7XHJcblx0XHRpZiAoY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLmxvZ2ljTG9vcClcclxuXHRcdFx0Y3VycmVudE1hcC5sb2dpY0xvb3AoZGVsdGEpO1xyXG5cdFx0aWYgKFVJICYmIFVJLmxvZ2ljTG9vcClcclxuXHRcdFx0VUkubG9naWNMb29wKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKGNvbnRyb2xsZXIgJiYgY29udHJvbGxlci5fdGljaylcclxuXHRcdFx0Y29udHJvbGxlci5fdGljayhkZWx0YSk7XHJcblx0XHRpZiAoU291bmRNYW5hZ2VyICYmIFNvdW5kTWFuYWdlci5fdGljaylcclxuXHRcdFx0U291bmRNYW5hZ2VyLl90aWNrKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0YWNjdW0gLT0gd2hvbGVUaWNrO1xyXG5cdH1cclxufSIsIi8vIHBvbHlmaWxsLmpzXHJcbi8vIERlZmluZXMgc29tZSBwb2x5ZmlsbHMgbmVlZGVkIGZvciB0aGUgZ2FtZSB0byBmdW5jdGlvbi5cclxuXHJcbi8vIFN0cmluZy5zdGFydHNXaXRoKClcclxuLy8gXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdzdGFydHNXaXRoJywge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcclxuXHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5sYXN0SW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbi8vIEV2ZW50VGFyZ2V0Lm9uKCkgYW5kIEV2ZW50VGFyZ2V0LmVtaXQoKVxyXG4vLyBBZGRpbmcgdGhpcyB0byBhbGxvdyBkb20gZWxlbWVudHMgYW5kIG9iamVjdHMgdG8gc2ltcGx5IGhhdmUgXCJvblwiIGFuZCBcImVtaXRcIiB1c2VkIGxpa2Ugbm9kZS5qcyBvYmplY3RzIGNhblxyXG5pZiAoIUV2ZW50VGFyZ2V0LnByb3RvdHlwZS5vbikge1xyXG5cdEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5vbiA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xyXG5cdEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5lbWl0ID0gRXZlbnRUYXJnZXQucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XHJcbn1cclxuXHJcbi8vIE1hdGguY2xhbXAoKVxyXG4vLyBcclxuaWYgKCFNYXRoLmNsYW1wKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KE1hdGgsIFwiY2xhbXBcIiwge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKG51bSwgbWluLCBtYXgpIHtcclxuXHRcdFx0bWluID0gKG1pbiAhPT0gdW5kZWZpbmVkKT8gbWluOjA7XHJcblx0XHRcdG1heCA9IChtYXggIT09IHVuZGVmaW5lZCk/IG1heDoxO1xyXG5cdFx0XHRyZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobnVtLCBtaW4pLCBtYXgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBBcnJheS50b3BcclxuLy8gUHJvdmlkZXMgZWFzeSBhY2Nlc3MgdG8gdGhlIFwidG9wXCIgb2YgYSBzdGFjaywgbWFkZSB3aXRoIHB1c2goKSBhbmQgcG9wKClcclxuaWYgKCFBcnJheS5wcm90b3R5cGUudG9wKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgXCJ0b3BcIiwge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0Ly8gc2V0OiBmdW5jdGlvbigpe30sXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiB0aGlzW3RoaXMubGVuZ3RoLTFdO1xyXG5cdFx0fSxcclxuXHR9KTtcclxufVxyXG5cclxuXHJcbi8vIE1vZGlmaWNhdGlvbnMgdG8gVEhSRUUuanNcclxue1xyXG5cdC8vIFZlY3RvcjMuc2V0KCksIG1vZGlmaWVkIHRvIGFjY2VwdCBhbm90aGVyIFZlY3RvcjNcclxuXHRUSFJFRS5WZWN0b3IzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7IHRoaXMueiA9IHguejtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7IHRoaXMueiA9IDA7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5OyB0aGlzLnogPSB6O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxuXHRcclxuXHQvLyBBbHNvIGZvciBWZWN0b3IyXHJcblx0VEhSRUUuVmVjdG9yMi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55O1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMueCA9IHg7IHRoaXMueSA9IHk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdFxyXG59XHJcblxyXG5cclxuIl19
