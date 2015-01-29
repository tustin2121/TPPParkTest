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
	
	currentMap = new Map("tGallery");
	currentMap.load();
	
	renderLoop.start({
		clearColor: 0x000000,
		ticksPerSecond : 30,
	});
	
});

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXGdhbGxlcnkuanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcYmFzZTY0LWpzXFxsaWJcXGI2NC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcaWVlZTc1NFxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxub2RlX21vZHVsZXNcXGlzLWFycmF5XFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxldmVudHNcXGV2ZW50cy5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxwcm9jZXNzXFxicm93c2VyLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHMuanMiLCJub2RlX21vZHVsZXNcXG1vbWVudFxcbW9tZW50LmpzIiwibm9kZV9tb2R1bGVzXFxuZGFycmF5XFxuZGFycmF5LmpzIiwibm9kZV9tb2R1bGVzXFxuZGFycmF5XFxub2RlX21vZHVsZXNcXGlvdGEtYXJyYXlcXGlvdGEuanMiLCJub2RlX21vZHVsZXNcXHJhZlxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXHJhZlxcbm9kZV9tb2R1bGVzXFxwZXJmb3JtYW5jZS1ub3dcXGxpYlxccGVyZm9ybWFuY2Utbm93LmpzIiwic3JjXFxqc1xcY2hhdFxcY29yZS5qcyIsInNyY1xcanNcXGNoYXRcXGRvbmdlci5qcyIsInNyY1xcanNcXGNoYXRcXHVzZXJsaXN0LmpzIiwic3JjXFxqc1xcZ2FtZXN0YXRlLmpzIiwic3JjXFxqc1xcZ2xvYmFscy5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxnYXJiYWdlLWNvbGxlY3Rvci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxzb3VuZG1hbmFnZXIuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcdWktbWFuYWdlci5qcyIsInNyY1xcanNcXG1hcC5qcyIsInNyY1xcanNcXG1vZGVsXFxtYXAtc2V0dXAuanMiLCJzcmNcXGpzXFxtb2RlbFxcbXRsLWxvYWRlci5qcyIsInNyY1xcanNcXG1vZGVsXFxvYmotbG9hZGVyLmpzIiwic3JjXFxqc1xcbW9kZWxcXHJlbmRlcmxvb3AuanMiLCJzcmNcXGpzXFxwb2x5ZmlsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzEzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcG5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGdhbGxlcnkuanNcclxuXHJcbi8vdmFyIFRIUkVFID0gcmVxdWlyZShcInRocmVlXCIpO1xyXG4vL3ZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcclxuLy92YXIgemlwID0gemlwLmpzXHJcblxyXG5yZXF1aXJlKFwiLi4vcG9seWZpbGwuanNcIik7XHJcbnZhciBNYXAgPSByZXF1aXJlKFwiLi4vbWFwXCIpO1xyXG52YXIgcmVuZGVyTG9vcCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9yZW5kZXJsb29wXCIpO1xyXG5cclxucmVxdWlyZShcIi4uL2dsb2JhbHNcIik7XHJcblxyXG52YXIgd2FycCA9IHJlcXVpcmUoXCJ0cHAtd2FycFwiKTtcclxuXHJcbi8vT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdFxyXG5cdGN1cnJlbnRNYXAgPSBuZXcgTWFwKFwidEdhbGxlcnlcIik7XHJcblx0Y3VycmVudE1hcC5sb2FkKCk7XHJcblx0XHJcblx0cmVuZGVyTG9vcC5zdGFydCh7XHJcblx0XHRjbGVhckNvbG9yOiAweDAwMDAwMCxcclxuXHRcdHRpY2tzUGVyU2Vjb25kIDogMzAsXHJcblx0fSk7XHJcblx0XHJcbn0pO1xyXG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBzdWJqZWN0ID4gMCA/IHN1YmplY3QgPj4+IDAgOiAwXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JylcbiAgICAgIHN1YmplY3QgPSBiYXNlNjRjbGVhbihzdWJqZWN0KVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAodGhpcy5sZW5ndGggPiBrTWF4TGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSAoKHN1YmplY3RbaV0gJSAyNTYpICsgMjU2KSAlIDI1NlxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZighQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heClcbiAgICAgIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKGJ5dGUpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiB1dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoLCAyKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGFzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW47XG4gICAgaWYgKHN0YXJ0IDwgMClcbiAgICAgIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKVxuICAgICAgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KVxuICAgIGVuZCA9IHN0YXJ0XG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSlcbiAgICByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgaWYgKHRhcmdldF9zdGFydCA8IDAgfHwgdGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHNvdXJjZS5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtel0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpIHtcbiAgICAgIGJ5dGVBcnJheS5wdXNoKGIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCwgdW5pdFNpemUpIHtcbiAgaWYgKHVuaXRTaXplKSBsZW5ndGggLT0gbGVuZ3RoICUgdW5pdFNpemU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUylcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0gpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluaGVyaXRzXG5cbmZ1bmN0aW9uIGluaGVyaXRzIChjLCBwLCBwcm90bykge1xuICBwcm90byA9IHByb3RvIHx8IHt9XG4gIHZhciBlID0ge31cbiAgO1tjLnByb3RvdHlwZSwgcHJvdG9dLmZvckVhY2goZnVuY3Rpb24gKHMpIHtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICBlW2tdID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzLCBrKVxuICAgIH0pXG4gIH0pXG4gIGMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwLnByb3RvdHlwZSwgZSlcbiAgYy5zdXBlciA9IHBcbn1cblxuLy9mdW5jdGlvbiBDaGlsZCAoKSB7XG4vLyAgQ2hpbGQuc3VwZXIuY2FsbCh0aGlzKVxuLy8gIGNvbnNvbGUuZXJyb3IoW3RoaXNcbi8vICAgICAgICAgICAgICAgICx0aGlzLmNvbnN0cnVjdG9yXG4vLyAgICAgICAgICAgICAgICAsdGhpcy5jb25zdHJ1Y3RvciA9PT0gQ2hpbGRcbi8vICAgICAgICAgICAgICAgICx0aGlzLmNvbnN0cnVjdG9yLnN1cGVyID09PSBQYXJlbnRcbi8vICAgICAgICAgICAgICAgICxPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykgPT09IENoaWxkLnByb3RvdHlwZVxuLy8gICAgICAgICAgICAgICAgLE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykpXG4vLyAgICAgICAgICAgICAgICAgPT09IFBhcmVudC5wcm90b3R5cGVcbi8vICAgICAgICAgICAgICAgICx0aGlzIGluc3RhbmNlb2YgQ2hpbGRcbi8vICAgICAgICAgICAgICAgICx0aGlzIGluc3RhbmNlb2YgUGFyZW50XSlcbi8vfVxuLy9mdW5jdGlvbiBQYXJlbnQgKCkge31cbi8vaW5oZXJpdHMoQ2hpbGQsIFBhcmVudClcbi8vbmV3IENoaWxkXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vLyEgbW9tZW50LmpzXG4vLyEgdmVyc2lvbiA6IDIuOC40XG4vLyEgYXV0aG9ycyA6IFRpbSBXb29kLCBJc2tyZW4gQ2hlcm5ldiwgTW9tZW50LmpzIGNvbnRyaWJ1dG9yc1xuLy8hIGxpY2Vuc2UgOiBNSVRcbi8vISBtb21lbnRqcy5jb21cblxuKGZ1bmN0aW9uICh1bmRlZmluZWQpIHtcbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIENvbnN0YW50c1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIHZhciBtb21lbnQsXG4gICAgICAgIFZFUlNJT04gPSAnMi44LjQnLFxuICAgICAgICAvLyB0aGUgZ2xvYmFsLXNjb3BlIHRoaXMgaXMgTk9UIHRoZSBnbG9iYWwgb2JqZWN0IGluIE5vZGUuanNcbiAgICAgICAgZ2xvYmFsU2NvcGUgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHRoaXMsXG4gICAgICAgIG9sZEdsb2JhbE1vbWVudCxcbiAgICAgICAgcm91bmQgPSBNYXRoLnJvdW5kLFxuICAgICAgICBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gICAgICAgIGksXG5cbiAgICAgICAgWUVBUiA9IDAsXG4gICAgICAgIE1PTlRIID0gMSxcbiAgICAgICAgREFURSA9IDIsXG4gICAgICAgIEhPVVIgPSAzLFxuICAgICAgICBNSU5VVEUgPSA0LFxuICAgICAgICBTRUNPTkQgPSA1LFxuICAgICAgICBNSUxMSVNFQ09ORCA9IDYsXG5cbiAgICAgICAgLy8gaW50ZXJuYWwgc3RvcmFnZSBmb3IgbG9jYWxlIGNvbmZpZyBmaWxlc1xuICAgICAgICBsb2NhbGVzID0ge30sXG5cbiAgICAgICAgLy8gZXh0cmEgbW9tZW50IGludGVybmFsIHByb3BlcnRpZXMgKHBsdWdpbnMgcmVnaXN0ZXIgcHJvcHMgaGVyZSlcbiAgICAgICAgbW9tZW50UHJvcGVydGllcyA9IFtdLFxuXG4gICAgICAgIC8vIGNoZWNrIGZvciBub2RlSlNcbiAgICAgICAgaGFzTW9kdWxlID0gKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyksXG5cbiAgICAgICAgLy8gQVNQLk5FVCBqc29uIGRhdGUgZm9ybWF0IHJlZ2V4XG4gICAgICAgIGFzcE5ldEpzb25SZWdleCA9IC9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2ksXG4gICAgICAgIGFzcE5ldFRpbWVTcGFuSnNvblJlZ2V4ID0gLyhcXC0pPyg/OihcXGQqKVxcLik/KFxcZCspXFw6KFxcZCspKD86XFw6KFxcZCspXFwuPyhcXGR7M30pPyk/LyxcblxuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9kb2NzLmNsb3N1cmUtbGlicmFyeS5nb29nbGVjb2RlLmNvbS9naXQvY2xvc3VyZV9nb29nX2RhdGVfZGF0ZS5qcy5zb3VyY2UuaHRtbFxuICAgICAgICAvLyBzb21ld2hhdCBtb3JlIGluIGxpbmUgd2l0aCA0LjQuMy4yIDIwMDQgc3BlYywgYnV0IGFsbG93cyBkZWNpbWFsIGFueXdoZXJlXG4gICAgICAgIGlzb0R1cmF0aW9uUmVnZXggPSAvXigtKT9QKD86KD86KFswLTksLl0qKVkpPyg/OihbMC05LC5dKilNKT8oPzooWzAtOSwuXSopRCk/KD86VCg/OihbMC05LC5dKilIKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKVMpPyk/fChbMC05LC5dKilXKSQvLFxuXG4gICAgICAgIC8vIGZvcm1hdCB0b2tlbnNcbiAgICAgICAgZm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhNb3xNTT9NP00/fERvfERERG98REQ/RD9EP3xkZGQ/ZD98ZG8/fHdbb3x3XT98V1tvfFddP3xRfFlZWVlZWXxZWVlZWXxZWVlZfFlZfGdnKGdnZz8pP3xHRyhHR0c/KT98ZXxFfGF8QXxoaD98SEg/fG1tP3xzcz98U3sxLDR9fHh8WHx6ej98Wlo/fC4pL2csXG4gICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhMVFN8TFR8TEw/TD9MP3xsezEsNH0pL2csXG5cbiAgICAgICAgLy8gcGFyc2luZyB0b2tlbiByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cyA9IC9cXGRcXGQ/LywgLy8gMCAtIDk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1RocmVlRGlnaXRzID0gL1xcZHsxLDN9LywgLy8gMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9Gb3VyRGlnaXRzID0gL1xcZHsxLDR9LywgLy8gMCAtIDk5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzID0gL1srXFwtXT9cXGR7MSw2fS8sIC8vIC05OTksOTk5IC0gOTk5LDk5OVxuICAgICAgICBwYXJzZVRva2VuRGlnaXRzID0gL1xcZCsvLCAvLyBub256ZXJvIG51bWJlciBvZiBkaWdpdHNcbiAgICAgICAgcGFyc2VUb2tlbldvcmQgPSAvWzAtOV0qWydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdK3xbXFx1MDYwMC1cXHUwNkZGXFwvXSsoXFxzKj9bXFx1MDYwMC1cXHUwNkZGXSspezEsMn0vaSwgLy8gYW55IHdvcmQgKG9yIHR3bykgY2hhcmFjdGVycyBvciBudW1iZXJzIGluY2x1ZGluZyB0d28vdGhyZWUgd29yZCBtb250aCBpbiBhcmFiaWMuXG4gICAgICAgIHBhcnNlVG9rZW5UaW1lem9uZSA9IC9afFtcXCtcXC1dXFxkXFxkOj9cXGRcXGQvZ2ksIC8vICswMDowMCAtMDA6MDAgKzAwMDAgLTAwMDAgb3IgWlxuICAgICAgICBwYXJzZVRva2VuVCA9IC9UL2ksIC8vIFQgKElTTyBzZXBhcmF0b3IpXG4gICAgICAgIHBhcnNlVG9rZW5PZmZzZXRNcyA9IC9bXFwrXFwtXT9cXGQrLywgLy8gMTIzNDU2Nzg5MDEyM1xuICAgICAgICBwYXJzZVRva2VuVGltZXN0YW1wTXMgPSAvW1xcK1xcLV0/XFxkKyhcXC5cXGR7MSwzfSk/LywgLy8gMTIzNDU2Nzg5IDEyMzQ1Njc4OS4xMjNcblxuICAgICAgICAvL3N0cmljdCBwYXJzaW5nIHJlZ2V4ZXNcbiAgICAgICAgcGFyc2VUb2tlbk9uZURpZ2l0ID0gL1xcZC8sIC8vIDAgLSA5XG4gICAgICAgIHBhcnNlVG9rZW5Ud29EaWdpdHMgPSAvXFxkXFxkLywgLy8gMDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuVGhyZWVEaWdpdHMgPSAvXFxkezN9LywgLy8gMDAwIC0gOTk5XG4gICAgICAgIHBhcnNlVG9rZW5Gb3VyRGlnaXRzID0gL1xcZHs0fS8sIC8vIDAwMDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaXhEaWdpdHMgPSAvWystXT9cXGR7Nn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlblNpZ25lZE51bWJlciA9IC9bKy1dP1xcZCsvLCAvLyAtaW5mIC0gaW5mXG5cbiAgICAgICAgLy8gaXNvIDg2MDEgcmVnZXhcbiAgICAgICAgLy8gMDAwMC0wMC0wMCAwMDAwLVcwMCBvciAwMDAwLVcwMC0wICsgVCArIDAwIG9yIDAwOjAwIG9yIDAwOjAwOjAwIG9yIDAwOjAwOjAwLjAwMCArICswMDowMCBvciArMDAwMCBvciArMDApXG4gICAgICAgIGlzb1JlZ2V4ID0gL15cXHMqKD86WystXVxcZHs2fXxcXGR7NH0pLSg/OihcXGRcXGQtXFxkXFxkKXwoV1xcZFxcZCQpfChXXFxkXFxkLVxcZCl8KFxcZFxcZFxcZCkpKChUfCApKFxcZFxcZCg6XFxkXFxkKDpcXGRcXGQoXFwuXFxkKyk/KT8pPyk/KFtcXCtcXC1dXFxkXFxkKD86Oj9cXGRcXGQpP3xcXHMqWik/KT8kLyxcblxuICAgICAgICBpc29Gb3JtYXQgPSAnWVlZWS1NTS1ERFRISDptbTpzc1onLFxuXG4gICAgICAgIGlzb0RhdGVzID0gW1xuICAgICAgICAgICAgWydZWVlZWVktTU0tREQnLCAvWystXVxcZHs2fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ1lZWVktTU0tREQnLCAvXFxkezR9LVxcZHsyfS1cXGR7Mn0vXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVy1FJywgL1xcZHs0fS1XXFxkezJ9LVxcZC9dLFxuICAgICAgICAgICAgWydHR0dHLVtXXVdXJywgL1xcZHs0fS1XXFxkezJ9L10sXG4gICAgICAgICAgICBbJ1lZWVktREREJywgL1xcZHs0fS1cXGR7M30vXVxuICAgICAgICBdLFxuXG4gICAgICAgIC8vIGlzbyB0aW1lIGZvcm1hdHMgYW5kIHJlZ2V4ZXNcbiAgICAgICAgaXNvVGltZXMgPSBbXG4gICAgICAgICAgICBbJ0hIOm1tOnNzLlNTU1MnLCAvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZFxcLlxcZCsvXSxcbiAgICAgICAgICAgIFsnSEg6bW06c3MnLCAvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZC9dLFxuICAgICAgICAgICAgWydISDptbScsIC8oVHwgKVxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEgnLCAvKFR8IClcXGRcXGQvXVxuICAgICAgICBdLFxuXG4gICAgICAgIC8vIHRpbWV6b25lIGNodW5rZXIgJysxMDowMCcgPiBbJzEwJywgJzAwJ10gb3IgJy0xNTMwJyA+IFsnLTE1JywgJzMwJ11cbiAgICAgICAgcGFyc2VUaW1lem9uZUNodW5rZXIgPSAvKFtcXCtcXC1dfFxcZFxcZCkvZ2ksXG5cbiAgICAgICAgLy8gZ2V0dGVyIGFuZCBzZXR0ZXIgbmFtZXNcbiAgICAgICAgcHJveHlHZXR0ZXJzQW5kU2V0dGVycyA9ICdEYXRlfEhvdXJzfE1pbnV0ZXN8U2Vjb25kc3xNaWxsaXNlY29uZHMnLnNwbGl0KCd8JyksXG4gICAgICAgIHVuaXRNaWxsaXNlY29uZEZhY3RvcnMgPSB7XG4gICAgICAgICAgICAnTWlsbGlzZWNvbmRzJyA6IDEsXG4gICAgICAgICAgICAnU2Vjb25kcycgOiAxZTMsXG4gICAgICAgICAgICAnTWludXRlcycgOiA2ZTQsXG4gICAgICAgICAgICAnSG91cnMnIDogMzZlNSxcbiAgICAgICAgICAgICdEYXlzJyA6IDg2NGU1LFxuICAgICAgICAgICAgJ01vbnRocycgOiAyNTkyZTYsXG4gICAgICAgICAgICAnWWVhcnMnIDogMzE1MzZlNlxuICAgICAgICB9LFxuXG4gICAgICAgIHVuaXRBbGlhc2VzID0ge1xuICAgICAgICAgICAgbXMgOiAnbWlsbGlzZWNvbmQnLFxuICAgICAgICAgICAgcyA6ICdzZWNvbmQnLFxuICAgICAgICAgICAgbSA6ICdtaW51dGUnLFxuICAgICAgICAgICAgaCA6ICdob3VyJyxcbiAgICAgICAgICAgIGQgOiAnZGF5JyxcbiAgICAgICAgICAgIEQgOiAnZGF0ZScsXG4gICAgICAgICAgICB3IDogJ3dlZWsnLFxuICAgICAgICAgICAgVyA6ICdpc29XZWVrJyxcbiAgICAgICAgICAgIE0gOiAnbW9udGgnLFxuICAgICAgICAgICAgUSA6ICdxdWFydGVyJyxcbiAgICAgICAgICAgIHkgOiAneWVhcicsXG4gICAgICAgICAgICBEREQgOiAnZGF5T2ZZZWFyJyxcbiAgICAgICAgICAgIGUgOiAnd2Vla2RheScsXG4gICAgICAgICAgICBFIDogJ2lzb1dlZWtkYXknLFxuICAgICAgICAgICAgZ2c6ICd3ZWVrWWVhcicsXG4gICAgICAgICAgICBHRzogJ2lzb1dlZWtZZWFyJ1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbWVsRnVuY3Rpb25zID0ge1xuICAgICAgICAgICAgZGF5b2Z5ZWFyIDogJ2RheU9mWWVhcicsXG4gICAgICAgICAgICBpc293ZWVrZGF5IDogJ2lzb1dlZWtkYXknLFxuICAgICAgICAgICAgaXNvd2VlayA6ICdpc29XZWVrJyxcbiAgICAgICAgICAgIHdlZWt5ZWFyIDogJ3dlZWtZZWFyJyxcbiAgICAgICAgICAgIGlzb3dlZWt5ZWFyIDogJ2lzb1dlZWtZZWFyJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGZvcm1hdCBmdW5jdGlvbiBzdHJpbmdzXG4gICAgICAgIGZvcm1hdEZ1bmN0aW9ucyA9IHt9LFxuXG4gICAgICAgIC8vIGRlZmF1bHQgcmVsYXRpdmUgdGltZSB0aHJlc2hvbGRzXG4gICAgICAgIHJlbGF0aXZlVGltZVRocmVzaG9sZHMgPSB7XG4gICAgICAgICAgICBzOiA0NSwgIC8vIHNlY29uZHMgdG8gbWludXRlXG4gICAgICAgICAgICBtOiA0NSwgIC8vIG1pbnV0ZXMgdG8gaG91clxuICAgICAgICAgICAgaDogMjIsICAvLyBob3VycyB0byBkYXlcbiAgICAgICAgICAgIGQ6IDI2LCAgLy8gZGF5cyB0byBtb250aFxuICAgICAgICAgICAgTTogMTEgICAvLyBtb250aHMgdG8geWVhclxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIHRva2VucyB0byBvcmRpbmFsaXplIGFuZCBwYWRcbiAgICAgICAgb3JkaW5hbGl6ZVRva2VucyA9ICdEREQgdyBXIE0gRCBkJy5zcGxpdCgnICcpLFxuICAgICAgICBwYWRkZWRUb2tlbnMgPSAnTSBEIEggaCBtIHMgdyBXJy5zcGxpdCgnICcpLFxuXG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zID0ge1xuICAgICAgICAgICAgTSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tb250aCgpICsgMTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBNTU0gIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHNTaG9ydCh0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE1NTU0gOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1vbnRocyh0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEQgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIERERCAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF5T2ZZZWFyKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZCAgIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c01pbih0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRkZCAgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZGRkIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5cyh0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHcgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2VlaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFcgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNvV2VlaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSAlIDEwMCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMueWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWVlZWSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMueWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWVlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHkgPSB0aGlzLnllYXIoKSwgc2lnbiA9IHkgPj0gMCA/ICcrJyA6ICctJztcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlZnRaZXJvRmlsbChNYXRoLmFicyh5KSwgNik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2cgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMud2Vla1llYXIoKSAlIDEwMCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2dnZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMud2Vla1llYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2dnZ2cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCksIDUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEdHICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLmlzb1dlZWtZZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEdHR0cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLmlzb1dlZWtZZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEdHR0dHIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndlZWtkYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWtkYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tZXJpZGllbSh0aGlzLmhvdXJzKCksIHRoaXMubWludXRlcygpLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBBICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tZXJpZGllbSh0aGlzLmhvdXJzKCksIHRoaXMubWludXRlcygpLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgSCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob3VycygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG91cnMoKSAlIDEyIHx8IDEyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG0gICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubWludXRlcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHMgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Vjb25kcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFMgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvSW50KHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0b0ludCh0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTApLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTU1MgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5taWxsaXNlY29uZHMoKSwgMyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1NTUyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMubWlsbGlzZWNvbmRzKCksIDMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFogICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSAtdGhpcy56b25lKCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSAnKyc7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9ICctJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyAnOicgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSkgJSA2MCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWlogICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IC10aGlzLnpvbmUoKSxcbiAgICAgICAgICAgICAgICAgICAgYiA9ICcrJztcbiAgICAgICAgICAgICAgICBpZiAoYSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYSA9IC1hO1xuICAgICAgICAgICAgICAgICAgICBiID0gJy0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYiArIGxlZnRaZXJvRmlsbCh0b0ludChhIC8gNjApLCAyKSArIGxlZnRaZXJvRmlsbCh0b0ludChhKSAlIDYwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVBYmJyKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgenogOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZU5hbWUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB4ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBYICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVuaXgoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBRIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1YXJ0ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBkZXByZWNhdGlvbnMgPSB7fSxcblxuICAgICAgICBsaXN0cyA9IFsnbW9udGhzJywgJ21vbnRoc1Nob3J0JywgJ3dlZWtkYXlzJywgJ3dlZWtkYXlzU2hvcnQnLCAnd2Vla2RheXNNaW4nXTtcblxuICAgIC8vIFBpY2sgdGhlIGZpcnN0IGRlZmluZWQgb2YgdHdvIG9yIHRocmVlIGFyZ3VtZW50cy4gZGZsIGNvbWVzIGZyb21cbiAgICAvLyBkZWZhdWx0LlxuICAgIGZ1bmN0aW9uIGRmbChhLCBiLCBjKSB7XG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAyOiByZXR1cm4gYSAhPSBudWxsID8gYSA6IGI7XG4gICAgICAgICAgICBjYXNlIDM6IHJldHVybiBhICE9IG51bGwgPyBhIDogYiAhPSBudWxsID8gYiA6IGM7XG4gICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ0ltcGxlbWVudCBtZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFzT3duUHJvcChhLCBiKSB7XG4gICAgICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKGEsIGIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlZmF1bHRQYXJzaW5nRmxhZ3MoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZGVlcCBjbG9uZSB0aGlzIG9iamVjdCwgYW5kIGVzNSBzdGFuZGFyZCBpcyBub3QgdmVyeVxuICAgICAgICAvLyBoZWxwZnVsLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW1wdHkgOiBmYWxzZSxcbiAgICAgICAgICAgIHVudXNlZFRva2VucyA6IFtdLFxuICAgICAgICAgICAgdW51c2VkSW5wdXQgOiBbXSxcbiAgICAgICAgICAgIG92ZXJmbG93IDogLTIsXG4gICAgICAgICAgICBjaGFyc0xlZnRPdmVyIDogMCxcbiAgICAgICAgICAgIG51bGxJbnB1dCA6IGZhbHNlLFxuICAgICAgICAgICAgaW52YWxpZE1vbnRoIDogbnVsbCxcbiAgICAgICAgICAgIGludmFsaWRGb3JtYXQgOiBmYWxzZSxcbiAgICAgICAgICAgIHVzZXJJbnZhbGlkYXRlZCA6IGZhbHNlLFxuICAgICAgICAgICAgaXNvOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByaW50TXNnKG1zZykge1xuICAgICAgICBpZiAobW9tZW50LnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0RlcHJlY2F0aW9uIHdhcm5pbmc6ICcgKyBtc2cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVwcmVjYXRlKG1zZywgZm4pIHtcbiAgICAgICAgdmFyIGZpcnN0VGltZSA9IHRydWU7XG4gICAgICAgIHJldHVybiBleHRlbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGZpcnN0VGltZSkge1xuICAgICAgICAgICAgICAgIHByaW50TXNnKG1zZyk7XG4gICAgICAgICAgICAgICAgZmlyc3RUaW1lID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSwgZm4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZVNpbXBsZShuYW1lLCBtc2cpIHtcbiAgICAgICAgaWYgKCFkZXByZWNhdGlvbnNbbmFtZV0pIHtcbiAgICAgICAgICAgIHByaW50TXNnKG1zZyk7XG4gICAgICAgICAgICBkZXByZWNhdGlvbnNbbmFtZV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFkVG9rZW4oZnVuYywgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKGZ1bmMuY2FsbCh0aGlzLCBhKSwgY291bnQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBvcmRpbmFsaXplVG9rZW4oZnVuYywgcGVyaW9kKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm9yZGluYWwoZnVuYy5jYWxsKHRoaXMsIGEpLCBwZXJpb2QpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHdoaWxlIChvcmRpbmFsaXplVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICBpID0gb3JkaW5hbGl6ZVRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArICdvJ10gPSBvcmRpbmFsaXplVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIGkpO1xuICAgIH1cbiAgICB3aGlsZSAocGFkZGVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICBpID0gcGFkZGVkVG9rZW5zLnBvcCgpO1xuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpICsgaV0gPSBwYWRUb2tlbihmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpXSwgMik7XG4gICAgfVxuICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zLkREREQgPSBwYWRUb2tlbihmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREQsIDMpO1xuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIENvbnN0cnVjdG9yc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIGZ1bmN0aW9uIExvY2FsZSgpIHtcbiAgICB9XG5cbiAgICAvLyBNb21lbnQgcHJvdG90eXBlIG9iamVjdFxuICAgIGZ1bmN0aW9uIE1vbWVudChjb25maWcsIHNraXBPdmVyZmxvdykge1xuICAgICAgICBpZiAoc2tpcE92ZXJmbG93ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIGNvcHlDb25maWcodGhpcywgY29uZmlnKTtcbiAgICAgICAgdGhpcy5fZCA9IG5ldyBEYXRlKCtjb25maWcuX2QpO1xuICAgIH1cblxuICAgIC8vIER1cmF0aW9uIENvbnN0cnVjdG9yXG4gICAgZnVuY3Rpb24gRHVyYXRpb24oZHVyYXRpb24pIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGR1cmF0aW9uKSxcbiAgICAgICAgICAgIHllYXJzID0gbm9ybWFsaXplZElucHV0LnllYXIgfHwgMCxcbiAgICAgICAgICAgIHF1YXJ0ZXJzID0gbm9ybWFsaXplZElucHV0LnF1YXJ0ZXIgfHwgMCxcbiAgICAgICAgICAgIG1vbnRocyA9IG5vcm1hbGl6ZWRJbnB1dC5tb250aCB8fCAwLFxuICAgICAgICAgICAgd2Vla3MgPSBub3JtYWxpemVkSW5wdXQud2VlayB8fCAwLFxuICAgICAgICAgICAgZGF5cyA9IG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgMCxcbiAgICAgICAgICAgIGhvdXJzID0gbm9ybWFsaXplZElucHV0LmhvdXIgfHwgMCxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBub3JtYWxpemVkSW5wdXQubWludXRlIHx8IDAsXG4gICAgICAgICAgICBzZWNvbmRzID0gbm9ybWFsaXplZElucHV0LnNlY29uZCB8fCAwLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kIHx8IDA7XG5cbiAgICAgICAgLy8gcmVwcmVzZW50YXRpb24gZm9yIGRhdGVBZGRSZW1vdmVcbiAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzID0gK21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICBzZWNvbmRzICogMWUzICsgLy8gMTAwMFxuICAgICAgICAgICAgbWludXRlcyAqIDZlNCArIC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgaG91cnMgKiAzNmU1OyAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAvLyBCZWNhdXNlIG9mIGRhdGVBZGRSZW1vdmUgdHJlYXRzIDI0IGhvdXJzIGFzIGRpZmZlcmVudCBmcm9tIGFcbiAgICAgICAgLy8gZGF5IHdoZW4gd29ya2luZyBhcm91bmQgRFNULCB3ZSBuZWVkIHRvIHN0b3JlIHRoZW0gc2VwYXJhdGVseVxuICAgICAgICB0aGlzLl9kYXlzID0gK2RheXMgK1xuICAgICAgICAgICAgd2Vla3MgKiA3O1xuICAgICAgICAvLyBJdCBpcyBpbXBvc3NpYmxlIHRyYW5zbGF0ZSBtb250aHMgaW50byBkYXlzIHdpdGhvdXQga25vd2luZ1xuICAgICAgICAvLyB3aGljaCBtb250aHMgeW91IGFyZSBhcmUgdGFsa2luZyBhYm91dCwgc28gd2UgaGF2ZSB0byBzdG9yZVxuICAgICAgICAvLyBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICB0aGlzLl9tb250aHMgPSArbW9udGhzICtcbiAgICAgICAgICAgIHF1YXJ0ZXJzICogMyArXG4gICAgICAgICAgICB5ZWFycyAqIDEyO1xuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcblxuICAgICAgICB0aGlzLl9sb2NhbGUgPSBtb21lbnQubG9jYWxlRGF0YSgpO1xuXG4gICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgSGVscGVyc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGEsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBiKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcChiLCBpKSkge1xuICAgICAgICAgICAgICAgIGFbaV0gPSBiW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc093blByb3AoYiwgJ3RvU3RyaW5nJykpIHtcbiAgICAgICAgICAgIGEudG9TdHJpbmcgPSBiLnRvU3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc093blByb3AoYiwgJ3ZhbHVlT2YnKSkge1xuICAgICAgICAgICAgYS52YWx1ZU9mID0gYi52YWx1ZU9mO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29weUNvbmZpZyh0bywgZnJvbSkge1xuICAgICAgICB2YXIgaSwgcHJvcCwgdmFsO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5faXNBTW9tZW50T2JqZWN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzQU1vbWVudE9iamVjdCA9IGZyb20uX2lzQU1vbWVudE9iamVjdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2kgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5faSA9IGZyb20uX2k7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9mICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2YgPSBmcm9tLl9mO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9sID0gZnJvbS5fbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX3N0cmljdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9zdHJpY3QgPSBmcm9tLl9zdHJpY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl90em0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fdHptID0gZnJvbS5fdHptO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5faXNVVEMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5faXNVVEMgPSBmcm9tLl9pc1VUQztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX29mZnNldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9vZmZzZXQgPSBmcm9tLl9vZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9wZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9wZiA9IGZyb20uX3BmO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fbG9jYWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2xvY2FsZSA9IGZyb20uX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb21lbnRQcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZvciAoaSBpbiBtb21lbnRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IG1vbWVudFByb3BlcnRpZXNbaV07XG4gICAgICAgICAgICAgICAgdmFsID0gZnJvbVtwcm9wXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9bcHJvcF0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFic1JvdW5kKG51bWJlcikge1xuICAgICAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChudW1iZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IobnVtYmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxlZnQgemVybyBmaWxsIGEgbnVtYmVyXG4gICAgLy8gc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2xlZnQtemVyby1maWxsaW5nIGZvciBwZXJmb3JtYW5jZSBjb21wYXJpc29uXG4gICAgZnVuY3Rpb24gbGVmdFplcm9GaWxsKG51bWJlciwgdGFyZ2V0TGVuZ3RoLCBmb3JjZVNpZ24pIHtcbiAgICAgICAgdmFyIG91dHB1dCA9ICcnICsgTWF0aC5hYnMobnVtYmVyKSxcbiAgICAgICAgICAgIHNpZ24gPSBudW1iZXIgPj0gMDtcblxuICAgICAgICB3aGlsZSAob3V0cHV0Lmxlbmd0aCA8IHRhcmdldExlbmd0aCkge1xuICAgICAgICAgICAgb3V0cHV0ID0gJzAnICsgb3V0cHV0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoc2lnbiA/IChmb3JjZVNpZ24gPyAnKycgOiAnJykgOiAnLScpICsgb3V0cHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpIHtcbiAgICAgICAgdmFyIHJlcyA9IHttaWxsaXNlY29uZHM6IDAsIG1vbnRoczogMH07XG5cbiAgICAgICAgcmVzLm1vbnRocyA9IG90aGVyLm1vbnRoKCkgLSBiYXNlLm1vbnRoKCkgK1xuICAgICAgICAgICAgKG90aGVyLnllYXIoKSAtIGJhc2UueWVhcigpKSAqIDEyO1xuICAgICAgICBpZiAoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpLmlzQWZ0ZXIob3RoZXIpKSB7XG4gICAgICAgICAgICAtLXJlcy5tb250aHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXMubWlsbGlzZWNvbmRzID0gK290aGVyIC0gKyhiYXNlLmNsb25lKCkuYWRkKHJlcy5tb250aHMsICdNJykpO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpIHtcbiAgICAgICAgdmFyIHJlcztcbiAgICAgICAgb3RoZXIgPSBtYWtlQXMob3RoZXIsIGJhc2UpO1xuICAgICAgICBpZiAoYmFzZS5pc0JlZm9yZShvdGhlcikpIHtcbiAgICAgICAgICAgIHJlcyA9IHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzID0gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShvdGhlciwgYmFzZSk7XG4gICAgICAgICAgICByZXMubWlsbGlzZWNvbmRzID0gLXJlcy5taWxsaXNlY29uZHM7XG4gICAgICAgICAgICByZXMubW9udGhzID0gLXJlcy5tb250aHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIC8vIFRPRE86IHJlbW92ZSAnbmFtZScgYXJnIGFmdGVyIGRlcHJlY2F0aW9uIGlzIHJlbW92ZWRcbiAgICBmdW5jdGlvbiBjcmVhdGVBZGRlcihkaXJlY3Rpb24sIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwsIHBlcmlvZCkge1xuICAgICAgICAgICAgdmFyIGR1ciwgdG1wO1xuICAgICAgICAgICAgLy9pbnZlcnQgdGhlIGFyZ3VtZW50cywgYnV0IGNvbXBsYWluIGFib3V0IGl0XG4gICAgICAgICAgICBpZiAocGVyaW9kICE9PSBudWxsICYmICFpc05hTigrcGVyaW9kKSkge1xuICAgICAgICAgICAgICAgIGRlcHJlY2F0ZVNpbXBsZShuYW1lLCAnbW9tZW50KCkuJyArIG5hbWUgICsgJyhwZXJpb2QsIG51bWJlcikgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBtb21lbnQoKS4nICsgbmFtZSArICcobnVtYmVyLCBwZXJpb2QpLicpO1xuICAgICAgICAgICAgICAgIHRtcCA9IHZhbDsgdmFsID0gcGVyaW9kOyBwZXJpb2QgPSB0bXA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhbCA9IHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gK3ZhbCA6IHZhbDtcbiAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbih2YWwsIHBlcmlvZCk7XG4gICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsIGR1ciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQobW9tLCBkdXJhdGlvbiwgaXNBZGRpbmcsIHVwZGF0ZU9mZnNldCkge1xuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gZHVyYXRpb24uX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgIGRheXMgPSBkdXJhdGlvbi5fZGF5cyxcbiAgICAgICAgICAgIG1vbnRocyA9IGR1cmF0aW9uLl9tb250aHM7XG4gICAgICAgIHVwZGF0ZU9mZnNldCA9IHVwZGF0ZU9mZnNldCA9PSBudWxsID8gdHJ1ZSA6IHVwZGF0ZU9mZnNldDtcblxuICAgICAgICBpZiAobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgICAgICBtb20uX2Quc2V0VGltZSgrbW9tLl9kICsgbWlsbGlzZWNvbmRzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXlzKSB7XG4gICAgICAgICAgICByYXdTZXR0ZXIobW9tLCAnRGF0ZScsIHJhd0dldHRlcihtb20sICdEYXRlJykgKyBkYXlzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb250aHMpIHtcbiAgICAgICAgICAgIHJhd01vbnRoU2V0dGVyKG1vbSwgcmF3R2V0dGVyKG1vbSwgJ01vbnRoJykgKyBtb250aHMgKiBpc0FkZGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVwZGF0ZU9mZnNldCkge1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldChtb20sIGRheXMgfHwgbW9udGhzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNoZWNrIGlmIGlzIGFuIGFycmF5XG4gICAgZnVuY3Rpb24gaXNBcnJheShpbnB1dCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlucHV0KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RhdGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IERhdGVdJyB8fFxuICAgICAgICAgICAgaW5wdXQgaW5zdGFuY2VvZiBEYXRlO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgdHdvIGFycmF5cywgcmV0dXJuIHRoZSBudW1iZXIgb2YgZGlmZmVyZW5jZXNcbiAgICBmdW5jdGlvbiBjb21wYXJlQXJyYXlzKGFycmF5MSwgYXJyYXkyLCBkb250Q29udmVydCkge1xuICAgICAgICB2YXIgbGVuID0gTWF0aC5taW4oYXJyYXkxLmxlbmd0aCwgYXJyYXkyLmxlbmd0aCksXG4gICAgICAgICAgICBsZW5ndGhEaWZmID0gTWF0aC5hYnMoYXJyYXkxLmxlbmd0aCAtIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgZGlmZnMgPSAwLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKGRvbnRDb252ZXJ0ICYmIGFycmF5MVtpXSAhPT0gYXJyYXkyW2ldKSB8fFxuICAgICAgICAgICAgICAgICghZG9udENvbnZlcnQgJiYgdG9JbnQoYXJyYXkxW2ldKSAhPT0gdG9JbnQoYXJyYXkyW2ldKSkpIHtcbiAgICAgICAgICAgICAgICBkaWZmcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWZmcyArIGxlbmd0aERpZmY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplVW5pdHModW5pdHMpIHtcbiAgICAgICAgaWYgKHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgbG93ZXJlZCA9IHVuaXRzLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvKC4pcyQvLCAnJDEnKTtcbiAgICAgICAgICAgIHVuaXRzID0gdW5pdEFsaWFzZXNbdW5pdHNdIHx8IGNhbWVsRnVuY3Rpb25zW2xvd2VyZWRdIHx8IGxvd2VyZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuaXRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZU9iamVjdFVuaXRzKGlucHV0T2JqZWN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSB7fSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wLFxuICAgICAgICAgICAgcHJvcDtcblxuICAgICAgICBmb3IgKHByb3AgaW4gaW5wdXRPYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wKGlucHV0T2JqZWN0LCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wID0gbm9ybWFsaXplVW5pdHMocHJvcCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dFtub3JtYWxpemVkUHJvcF0gPSBpbnB1dE9iamVjdFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9ybWFsaXplZElucHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VMaXN0KGZpZWxkKSB7XG4gICAgICAgIHZhciBjb3VudCwgc2V0dGVyO1xuXG4gICAgICAgIGlmIChmaWVsZC5pbmRleE9mKCd3ZWVrJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gNztcbiAgICAgICAgICAgIHNldHRlciA9ICdkYXknO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGZpZWxkLmluZGV4T2YoJ21vbnRoJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gMTI7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnbW9udGgnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbW9tZW50W2ZpZWxkXSA9IGZ1bmN0aW9uIChmb3JtYXQsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaSwgZ2V0dGVyLFxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IG1vbWVudC5fbG9jYWxlW2ZpZWxkXSxcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gW107XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm9ybWF0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gZm9ybWF0O1xuICAgICAgICAgICAgICAgIGZvcm1hdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ2V0dGVyID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbSA9IG1vbWVudCgpLnV0YygpLnNldChzZXR0ZXIsIGkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QuY2FsbChtb21lbnQuX2xvY2FsZSwgbSwgZm9ybWF0IHx8ICcnKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldHRlcihpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0dGVyKGkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9JbnQoYXJndW1lbnRGb3JDb2VyY2lvbikge1xuICAgICAgICB2YXIgY29lcmNlZE51bWJlciA9ICthcmd1bWVudEZvckNvZXJjaW9uLFxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuXG4gICAgICAgIGlmIChjb2VyY2VkTnVtYmVyICE9PSAwICYmIGlzRmluaXRlKGNvZXJjZWROdW1iZXIpKSB7XG4gICAgICAgICAgICBpZiAoY29lcmNlZE51bWJlciA+PSAwKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmZsb29yKGNvZXJjZWROdW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGguY2VpbChjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5Nb250aCh5ZWFyLCBtb250aCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGggKyAxLCAwKSkuZ2V0VVRDRGF0ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdlZWtzSW5ZZWFyKHllYXIsIGRvdywgZG95KSB7XG4gICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbWVudChbeWVhciwgMTEsIDMxICsgZG93IC0gZG95XSksIGRvdywgZG95KS53ZWVrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJblllYXIoeWVhcikge1xuICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih5ZWFyKSA/IDM2NiA6IDM2NTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuICh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwKSB8fCB5ZWFyICUgNDAwID09PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrT3ZlcmZsb3cobSkge1xuICAgICAgICB2YXIgb3ZlcmZsb3c7XG4gICAgICAgIGlmIChtLl9hICYmIG0uX3BmLm92ZXJmbG93ID09PSAtMikge1xuICAgICAgICAgICAgb3ZlcmZsb3cgPVxuICAgICAgICAgICAgICAgIG0uX2FbTU9OVEhdIDwgMCB8fCBtLl9hW01PTlRIXSA+IDExID8gTU9OVEggOlxuICAgICAgICAgICAgICAgIG0uX2FbREFURV0gPCAxIHx8IG0uX2FbREFURV0gPiBkYXlzSW5Nb250aChtLl9hW1lFQVJdLCBtLl9hW01PTlRIXSkgPyBEQVRFIDpcbiAgICAgICAgICAgICAgICBtLl9hW0hPVVJdIDwgMCB8fCBtLl9hW0hPVVJdID4gMjQgfHxcbiAgICAgICAgICAgICAgICAgICAgKG0uX2FbSE9VUl0gPT09IDI0ICYmIChtLl9hW01JTlVURV0gIT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLl9hW1NFQ09ORF0gIT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLl9hW01JTExJU0VDT05EXSAhPT0gMCkpID8gSE9VUiA6XG4gICAgICAgICAgICAgICAgbS5fYVtNSU5VVEVdIDwgMCB8fCBtLl9hW01JTlVURV0gPiA1OSA/IE1JTlVURSA6XG4gICAgICAgICAgICAgICAgbS5fYVtTRUNPTkRdIDwgMCB8fCBtLl9hW1NFQ09ORF0gPiA1OSA/IFNFQ09ORCA6XG4gICAgICAgICAgICAgICAgbS5fYVtNSUxMSVNFQ09ORF0gPCAwIHx8IG0uX2FbTUlMTElTRUNPTkRdID4gOTk5ID8gTUlMTElTRUNPTkQgOlxuICAgICAgICAgICAgICAgIC0xO1xuXG4gICAgICAgICAgICBpZiAobS5fcGYuX292ZXJmbG93RGF5T2ZZZWFyICYmIChvdmVyZmxvdyA8IFlFQVIgfHwgb3ZlcmZsb3cgPiBEQVRFKSkge1xuICAgICAgICAgICAgICAgIG92ZXJmbG93ID0gREFURTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbS5fcGYub3ZlcmZsb3cgPSBvdmVyZmxvdztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWQobSkge1xuICAgICAgICBpZiAobS5faXNWYWxpZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBtLl9pc1ZhbGlkID0gIWlzTmFOKG0uX2QuZ2V0VGltZSgpKSAmJlxuICAgICAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93IDwgMCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5lbXB0eSAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkTW9udGggJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYubnVsbElucHV0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLmludmFsaWRGb3JtYXQgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYudXNlckludmFsaWRhdGVkO1xuXG4gICAgICAgICAgICBpZiAobS5fc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgbS5faXNWYWxpZCA9IG0uX2lzVmFsaWQgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYuY2hhcnNMZWZ0T3ZlciA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmJpZ0hvdXIgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS5faXNWYWxpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVMb2NhbGUoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgPyBrZXkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCdfJywgJy0nKSA6IGtleTtcbiAgICB9XG5cbiAgICAvLyBwaWNrIHRoZSBsb2NhbGUgZnJvbSB0aGUgYXJyYXlcbiAgICAvLyB0cnkgWydlbi1hdScsICdlbi1nYiddIGFzICdlbi1hdScsICdlbi1nYicsICdlbicsIGFzIGluIG1vdmUgdGhyb3VnaCB0aGUgbGlzdCB0cnlpbmcgZWFjaFxuICAgIC8vIHN1YnN0cmluZyBmcm9tIG1vc3Qgc3BlY2lmaWMgdG8gbGVhc3QsIGJ1dCBtb3ZlIHRvIHRoZSBuZXh0IGFycmF5IGl0ZW0gaWYgaXQncyBhIG1vcmUgc3BlY2lmaWMgdmFyaWFudCB0aGFuIHRoZSBjdXJyZW50IHJvb3RcbiAgICBmdW5jdGlvbiBjaG9vc2VMb2NhbGUobmFtZXMpIHtcbiAgICAgICAgdmFyIGkgPSAwLCBqLCBuZXh0LCBsb2NhbGUsIHNwbGl0O1xuXG4gICAgICAgIHdoaWxlIChpIDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBzcGxpdCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpXSkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIGogPSBzcGxpdC5sZW5ndGg7XG4gICAgICAgICAgICBuZXh0ID0gbm9ybWFsaXplTG9jYWxlKG5hbWVzW2kgKyAxXSk7XG4gICAgICAgICAgICBuZXh0ID0gbmV4dCA/IG5leHQuc3BsaXQoJy0nKSA6IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAoaiA+IDApIHtcbiAgICAgICAgICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKHNwbGl0LnNsaWNlKDAsIGopLmpvaW4oJy0nKSk7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmV4dCAmJiBuZXh0Lmxlbmd0aCA+PSBqICYmIGNvbXBhcmVBcnJheXMoc3BsaXQsIG5leHQsIHRydWUpID49IGogLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhlIG5leHQgYXJyYXkgaXRlbSBpcyBiZXR0ZXIgdGhhbiBhIHNoYWxsb3dlciBzdWJzdHJpbmcgb2YgdGhpcyBvbmVcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGotLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkTG9jYWxlKG5hbWUpIHtcbiAgICAgICAgdmFyIG9sZExvY2FsZSA9IG51bGw7XG4gICAgICAgIGlmICghbG9jYWxlc1tuYW1lXSAmJiBoYXNNb2R1bGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgb2xkTG9jYWxlID0gbW9tZW50LmxvY2FsZSgpO1xuICAgICAgICAgICAgICAgIHJlcXVpcmUoJy4vbG9jYWxlLycgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGRlZmluZUxvY2FsZSBjdXJyZW50bHkgYWxzbyBzZXRzIHRoZSBnbG9iYWwgbG9jYWxlLCB3ZSB3YW50IHRvIHVuZG8gdGhhdCBmb3IgbGF6eSBsb2FkZWQgbG9jYWxlc1xuICAgICAgICAgICAgICAgIG1vbWVudC5sb2NhbGUob2xkTG9jYWxlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhIG1vbWVudCBmcm9tIGlucHV0LCB0aGF0IGlzIGxvY2FsL3V0Yy96b25lIGVxdWl2YWxlbnQgdG8gbW9kZWwuXG4gICAgZnVuY3Rpb24gbWFrZUFzKGlucHV0LCBtb2RlbCkge1xuICAgICAgICB2YXIgcmVzLCBkaWZmO1xuICAgICAgICBpZiAobW9kZWwuX2lzVVRDKSB7XG4gICAgICAgICAgICByZXMgPSBtb2RlbC5jbG9uZSgpO1xuICAgICAgICAgICAgZGlmZiA9IChtb21lbnQuaXNNb21lbnQoaW5wdXQpIHx8IGlzRGF0ZShpbnB1dCkgP1xuICAgICAgICAgICAgICAgICAgICAraW5wdXQgOiArbW9tZW50KGlucHV0KSkgLSAoK3Jlcyk7XG4gICAgICAgICAgICAvLyBVc2UgbG93LWxldmVsIGFwaSwgYmVjYXVzZSB0aGlzIGZuIGlzIGxvdy1sZXZlbCBhcGkuXG4gICAgICAgICAgICByZXMuX2Quc2V0VGltZSgrcmVzLl9kICsgZGlmZik7XG4gICAgICAgICAgICBtb21lbnQudXBkYXRlT2Zmc2V0KHJlcywgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQoaW5wdXQpLmxvY2FsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIExvY2FsZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZXh0ZW5kKExvY2FsZS5wcm90b3R5cGUsIHtcblxuICAgICAgICBzZXQgOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgICAgICB2YXIgcHJvcCwgaTtcbiAgICAgICAgICAgIGZvciAoaSBpbiBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBwcm9wID0gY29uZmlnW2ldO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW2ldID0gcHJvcDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzWydfJyArIGldID0gcHJvcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBMZW5pZW50IG9yZGluYWwgcGFyc2luZyBhY2NlcHRzIGp1c3QgYSBudW1iZXIgaW4gYWRkaXRpb24gdG9cbiAgICAgICAgICAgIC8vIG51bWJlciArIChwb3NzaWJseSkgc3R1ZmYgY29taW5nIGZyb20gX29yZGluYWxQYXJzZUxlbmllbnQuXG4gICAgICAgICAgICB0aGlzLl9vcmRpbmFsUGFyc2VMZW5pZW50ID0gbmV3IFJlZ0V4cCh0aGlzLl9vcmRpbmFsUGFyc2Uuc291cmNlICsgJ3wnICsgL1xcZHsxLDJ9Ly5zb3VyY2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tb250aHMgOiAnSmFudWFyeV9GZWJydWFyeV9NYXJjaF9BcHJpbF9NYXlfSnVuZV9KdWx5X0F1Z3VzdF9TZXB0ZW1iZXJfT2N0b2Jlcl9Ob3ZlbWJlcl9EZWNlbWJlcicuc3BsaXQoJ18nKSxcbiAgICAgICAgbW9udGhzIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNbbS5tb250aCgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbW9udGhzU2hvcnQgOiAnSmFuX0ZlYl9NYXJfQXByX01heV9KdW5fSnVsX0F1Z19TZXBfT2N0X05vdl9EZWMnLnNwbGl0KCdfJyksXG4gICAgICAgIG1vbnRoc1Nob3J0IDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNTaG9ydFttLm1vbnRoKCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1vbnRoc1BhcnNlIDogZnVuY3Rpb24gKG1vbnRoTmFtZSwgZm9ybWF0LCBzdHJpY3QpIHtcbiAgICAgICAgICAgIHZhciBpLCBtb20sIHJlZ2V4O1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuX21vbnRoc1BhcnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbW9udGhzUGFyc2UgPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb25nTW9udGhzUGFyc2UgPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgbW9tID0gbW9tZW50LnV0YyhbMjAwMCwgaV0pO1xuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgIXRoaXMuX2xvbmdNb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpLnJlcGxhY2UoJy4nLCAnJykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJykucmVwbGFjZSgnLicsICcnKSArICckJywgJ2knKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJpY3QgJiYgIXRoaXMuX21vbnRoc1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4ID0gJ14nICsgdGhpcy5tb250aHMobW9tLCAnJykgKyAnfF4nICsgdGhpcy5tb250aHNTaG9ydChtb20sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRlc3QgdGhlIHJlZ2V4XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU1NJyAmJiB0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGZvcm1hdCA9PT0gJ01NTScgJiYgdGhpcy5fc2hvcnRNb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc3RyaWN0ICYmIHRoaXMuX21vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWtkYXlzIDogJ1N1bmRheV9Nb25kYXlfVHVlc2RheV9XZWRuZXNkYXlfVGh1cnNkYXlfRnJpZGF5X1NhdHVyZGF5Jy5zcGxpdCgnXycpLFxuICAgICAgICB3ZWVrZGF5cyA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNbbS5kYXkoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWtkYXlzU2hvcnQgOiAnU3VuX01vbl9UdWVfV2VkX1RodV9GcmlfU2F0Jy5zcGxpdCgnXycpLFxuICAgICAgICB3ZWVrZGF5c1Nob3J0IDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1Nob3J0W20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c01pbiA6ICdTdV9Nb19UdV9XZV9UaF9Gcl9TYScuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXNNaW4gOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzTWluW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtkYXlzUGFyc2UgOiBmdW5jdGlvbiAod2Vla2RheU5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpLCBtb20sIHJlZ2V4O1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3dlZWtkYXlzUGFyc2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHRoZSByZWdleCBpZiB3ZSBkb24ndCBoYXZlIGl0IGFscmVhZHlcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3dlZWtkYXlzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbW9tID0gbW9tZW50KFsyMDAwLCAxXSkuZGF5KGkpO1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMud2Vla2RheXMobW9tLCAnJykgKyAnfF4nICsgdGhpcy53ZWVrZGF5c1Nob3J0KG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNNaW4obW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRlc3QgdGhlIHJlZ2V4XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dlZWtkYXlzUGFyc2VbaV0udGVzdCh3ZWVrZGF5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9sb25nRGF0ZUZvcm1hdCA6IHtcbiAgICAgICAgICAgIExUUyA6ICdoOm1tOnNzIEEnLFxuICAgICAgICAgICAgTFQgOiAnaDptbSBBJyxcbiAgICAgICAgICAgIEwgOiAnTU0vREQvWVlZWScsXG4gICAgICAgICAgICBMTCA6ICdNTU1NIEQsIFlZWVknLFxuICAgICAgICAgICAgTExMIDogJ01NTU0gRCwgWVlZWSBMVCcsXG4gICAgICAgICAgICBMTExMIDogJ2RkZGQsIE1NTU0gRCwgWVlZWSBMVCdcbiAgICAgICAgfSxcbiAgICAgICAgbG9uZ0RhdGVGb3JtYXQgOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XTtcbiAgICAgICAgICAgIGlmICghb3V0cHV0ICYmIHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleS50b1VwcGVyQ2FzZSgpXSkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleS50b1VwcGVyQ2FzZSgpXS5yZXBsYWNlKC9NTU1NfE1NfEREfGRkZGQvZywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV0gPSBvdXRwdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzUE0gOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIC8vIElFOCBRdWlya3MgTW9kZSAmIElFNyBTdGFuZGFyZHMgTW9kZSBkbyBub3QgYWxsb3cgYWNjZXNzaW5nIHN0cmluZ3MgbGlrZSBhcnJheXNcbiAgICAgICAgICAgIC8vIFVzaW5nIGNoYXJBdCBzaG91bGQgYmUgbW9yZSBjb21wYXRpYmxlLlxuICAgICAgICAgICAgcmV0dXJuICgoaW5wdXQgKyAnJykudG9Mb3dlckNhc2UoKS5jaGFyQXQoMCkgPT09ICdwJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21lcmlkaWVtUGFyc2UgOiAvW2FwXVxcLj9tP1xcLj8vaSxcbiAgICAgICAgbWVyaWRpZW0gOiBmdW5jdGlvbiAoaG91cnMsIG1pbnV0ZXMsIGlzTG93ZXIpIHtcbiAgICAgICAgICAgIGlmIChob3VycyA+IDExKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzTG93ZXIgPyAncG0nIDogJ1BNJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzTG93ZXIgPyAnYW0nIDogJ0FNJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfY2FsZW5kYXIgOiB7XG4gICAgICAgICAgICBzYW1lRGF5IDogJ1tUb2RheSBhdF0gTFQnLFxuICAgICAgICAgICAgbmV4dERheSA6ICdbVG9tb3Jyb3cgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHRXZWVrIDogJ2RkZGQgW2F0XSBMVCcsXG4gICAgICAgICAgICBsYXN0RGF5IDogJ1tZZXN0ZXJkYXkgYXRdIExUJyxcbiAgICAgICAgICAgIGxhc3RXZWVrIDogJ1tMYXN0XSBkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgc2FtZUVsc2UgOiAnTCdcbiAgICAgICAgfSxcbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAoa2V5LCBtb20sIG5vdykge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2NhbGVuZGFyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJyA/IG91dHB1dC5hcHBseShtb20sIFtub3ddKSA6IG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVsYXRpdmVUaW1lIDoge1xuICAgICAgICAgICAgZnV0dXJlIDogJ2luICVzJyxcbiAgICAgICAgICAgIHBhc3QgOiAnJXMgYWdvJyxcbiAgICAgICAgICAgIHMgOiAnYSBmZXcgc2Vjb25kcycsXG4gICAgICAgICAgICBtIDogJ2EgbWludXRlJyxcbiAgICAgICAgICAgIG1tIDogJyVkIG1pbnV0ZXMnLFxuICAgICAgICAgICAgaCA6ICdhbiBob3VyJyxcbiAgICAgICAgICAgIGhoIDogJyVkIGhvdXJzJyxcbiAgICAgICAgICAgIGQgOiAnYSBkYXknLFxuICAgICAgICAgICAgZGQgOiAnJWQgZGF5cycsXG4gICAgICAgICAgICBNIDogJ2EgbW9udGgnLFxuICAgICAgICAgICAgTU0gOiAnJWQgbW9udGhzJyxcbiAgICAgICAgICAgIHkgOiAnYSB5ZWFyJyxcbiAgICAgICAgICAgIHl5IDogJyVkIHllYXJzJ1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbGF0aXZlVGltZSA6IGZ1bmN0aW9uIChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbc3RyaW5nXTtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgICAgICAgICAgICAgIG91dHB1dChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIDpcbiAgICAgICAgICAgICAgICBvdXRwdXQucmVwbGFjZSgvJWQvaSwgbnVtYmVyKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXN0RnV0dXJlIDogZnVuY3Rpb24gKGRpZmYsIG91dHB1dCkge1xuICAgICAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuX3JlbGF0aXZlVGltZVtkaWZmID4gMCA/ICdmdXR1cmUnIDogJ3Bhc3QnXTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZm9ybWF0ID09PSAnZnVuY3Rpb24nID8gZm9ybWF0KG91dHB1dCkgOiBmb3JtYXQucmVwbGFjZSgvJXMvaSwgb3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZSgnJWQnLCBudW1iZXIpO1xuICAgICAgICB9LFxuICAgICAgICBfb3JkaW5hbCA6ICclZCcsXG4gICAgICAgIF9vcmRpbmFsUGFyc2UgOiAvXFxkezEsMn0vLFxuXG4gICAgICAgIHByZXBhcnNlIDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICBwb3N0Zm9ybWF0IDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKG1vbSkge1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtPZlllYXIobW9tLCB0aGlzLl93ZWVrLmRvdywgdGhpcy5fd2Vlay5kb3kpLndlZWs7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWsgOiB7XG4gICAgICAgICAgICBkb3cgOiAwLCAvLyBTdW5kYXkgaXMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2Vlay5cbiAgICAgICAgICAgIGRveSA6IDYgIC8vIFRoZSB3ZWVrIHRoYXQgY29udGFpbnMgSmFuIDFzdCBpcyB0aGUgZmlyc3Qgd2VlayBvZiB0aGUgeWVhci5cbiAgICAgICAgfSxcblxuICAgICAgICBfaW52YWxpZERhdGU6ICdJbnZhbGlkIGRhdGUnLFxuICAgICAgICBpbnZhbGlkRGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ludmFsaWREYXRlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEZvcm1hdHRpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0Lm1hdGNoKC9cXFtbXFxzXFxTXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXFxcXC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUZvcm1hdEZ1bmN0aW9uKGZvcm1hdCkge1xuICAgICAgICB2YXIgYXJyYXkgPSBmb3JtYXQubWF0Y2goZm9ybWF0dGluZ1Rva2VucyksIGksIGxlbmd0aDtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXSkge1xuICAgICAgICAgICAgICAgIGFycmF5W2ldID0gZm9ybWF0VG9rZW5GdW5jdGlvbnNbYXJyYXlbaV1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoYXJyYXlbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSAnJztcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dHB1dCArPSBhcnJheVtpXSBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gYXJyYXlbaV0uY2FsbChtb20sIGZvcm1hdCkgOiBhcnJheVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZm9ybWF0IGRhdGUgdXNpbmcgbmF0aXZlIGRhdGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gZm9ybWF0TW9tZW50KG0sIGZvcm1hdCkge1xuICAgICAgICBpZiAoIW0uaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbS5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvcm1hdCA9IGV4cGFuZEZvcm1hdChmb3JtYXQsIG0ubG9jYWxlRGF0YSgpKTtcblxuICAgICAgICBpZiAoIWZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKSB7XG4gICAgICAgICAgICBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSA9IG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKG0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGFuZEZvcm1hdChmb3JtYXQsIGxvY2FsZSkge1xuICAgICAgICB2YXIgaSA9IDU7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlLmxvbmdEYXRlRm9ybWF0KGlucHV0KSB8fCBpbnB1dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICB3aGlsZSAoaSA+PSAwICYmIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy50ZXN0KGZvcm1hdCkpIHtcbiAgICAgICAgICAgIGZvcm1hdCA9IGZvcm1hdC5yZXBsYWNlKGxvY2FsRm9ybWF0dGluZ1Rva2VucywgcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKTtcbiAgICAgICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgUGFyc2luZ1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gZ2V0IHRoZSByZWdleCB0byBmaW5kIHRoZSBuZXh0IHRva2VuXG4gICAgZnVuY3Rpb24gZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpIHtcbiAgICAgICAgdmFyIGEsIHN0cmljdCA9IGNvbmZpZy5fc3RyaWN0O1xuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIGNhc2UgJ1EnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVEaWdpdDtcbiAgICAgICAgY2FzZSAnRERERCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRocmVlRGlnaXRzO1xuICAgICAgICBjYXNlICdZWVlZJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IHBhcnNlVG9rZW5Gb3VyRGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cztcbiAgICAgICAgY2FzZSAnWSc6XG4gICAgICAgIGNhc2UgJ0cnOlxuICAgICAgICBjYXNlICdnJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuU2lnbmVkTnVtYmVyO1xuICAgICAgICBjYXNlICdZWVlZWVknOlxuICAgICAgICBjYXNlICdZWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgY2FzZSAnZ2dnZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IHBhcnNlVG9rZW5TaXhEaWdpdHMgOiBwYXJzZVRva2VuT25lVG9TaXhEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblR3b0RpZ2l0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnU1NTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRocmVlRGlnaXRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdEREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVUb1RocmVlRGlnaXRzO1xuICAgICAgICBjYXNlICdNTU0nOlxuICAgICAgICBjYXNlICdNTU1NJzpcbiAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICBjYXNlICdkZGQnOlxuICAgICAgICBjYXNlICdkZGRkJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuV29yZDtcbiAgICAgICAgY2FzZSAnYSc6XG4gICAgICAgIGNhc2UgJ0EnOlxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5fbG9jYWxlLl9tZXJpZGllbVBhcnNlO1xuICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT2Zmc2V0TXM7XG4gICAgICAgIGNhc2UgJ1gnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaW1lc3RhbXBNcztcbiAgICAgICAgY2FzZSAnWic6XG4gICAgICAgIGNhc2UgJ1paJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXpvbmU7XG4gICAgICAgIGNhc2UgJ1QnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UO1xuICAgICAgICBjYXNlICdTU1NTJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuRGlnaXRzO1xuICAgICAgICBjYXNlICdNTSc6XG4gICAgICAgIGNhc2UgJ0REJzpcbiAgICAgICAgY2FzZSAnWVknOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgIGNhc2UgJ2dnJzpcbiAgICAgICAgY2FzZSAnSEgnOlxuICAgICAgICBjYXNlICdoaCc6XG4gICAgICAgIGNhc2UgJ21tJzpcbiAgICAgICAgY2FzZSAnc3MnOlxuICAgICAgICBjYXNlICd3dyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuVHdvRGlnaXRzIDogcGFyc2VUb2tlbk9uZU9yVHdvRGlnaXRzO1xuICAgICAgICBjYXNlICdNJzpcbiAgICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICBjYXNlICdIJzpcbiAgICAgICAgY2FzZSAnaCc6XG4gICAgICAgIGNhc2UgJ20nOlxuICAgICAgICBjYXNlICdzJzpcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICBjYXNlICdlJzpcbiAgICAgICAgY2FzZSAnRSc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZU9yVHdvRGlnaXRzO1xuICAgICAgICBjYXNlICdEbyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gY29uZmlnLl9sb2NhbGUuX29yZGluYWxQYXJzZSA6IGNvbmZpZy5fbG9jYWxlLl9vcmRpbmFsUGFyc2VMZW5pZW50O1xuICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgIGEgPSBuZXcgUmVnRXhwKHJlZ2V4cEVzY2FwZSh1bmVzY2FwZUZvcm1hdCh0b2tlbi5yZXBsYWNlKCdcXFxcJywgJycpKSwgJ2knKSk7XG4gICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyB8fCAnJztcbiAgICAgICAgdmFyIHBvc3NpYmxlVHpNYXRjaGVzID0gKHN0cmluZy5tYXRjaChwYXJzZVRva2VuVGltZXpvbmUpIHx8IFtdKSxcbiAgICAgICAgICAgIHR6Q2h1bmsgPSBwb3NzaWJsZVR6TWF0Y2hlc1twb3NzaWJsZVR6TWF0Y2hlcy5sZW5ndGggLSAxXSB8fCBbXSxcbiAgICAgICAgICAgIHBhcnRzID0gKHR6Q2h1bmsgKyAnJykubWF0Y2gocGFyc2VUaW1lem9uZUNodW5rZXIpIHx8IFsnLScsIDAsIDBdLFxuICAgICAgICAgICAgbWludXRlcyA9ICsocGFydHNbMV0gKiA2MCkgKyB0b0ludChwYXJ0c1syXSk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnRzWzBdID09PSAnKycgPyAtbWludXRlcyA6IG1pbnV0ZXM7XG4gICAgfVxuXG4gICAgLy8gZnVuY3Rpb24gdG8gY29udmVydCBzdHJpbmcgaW5wdXQgdG8gZGF0ZVxuICAgIGZ1bmN0aW9uIGFkZFRpbWVUb0FycmF5RnJvbVRva2VuKHRva2VuLCBpbnB1dCwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBkYXRlUGFydEFycmF5ID0gY29uZmlnLl9hO1xuXG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcbiAgICAgICAgLy8gUVVBUlRFUlxuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNT05USF0gPSAodG9JbnQoaW5wdXQpIC0gMSkgKiAzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE1PTlRIXG4gICAgICAgIGNhc2UgJ00nIDogLy8gZmFsbCB0aHJvdWdoIHRvIE1NXG4gICAgICAgIGNhc2UgJ01NJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gdG9JbnQoaW5wdXQpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdNTU0nIDogLy8gZmFsbCB0aHJvdWdoIHRvIE1NTU1cbiAgICAgICAgY2FzZSAnTU1NTScgOlxuICAgICAgICAgICAgYSA9IGNvbmZpZy5fbG9jYWxlLm1vbnRoc1BhcnNlKGlucHV0LCB0b2tlbiwgY29uZmlnLl9zdHJpY3QpO1xuICAgICAgICAgICAgLy8gaWYgd2UgZGlkbid0IGZpbmQgYSBtb250aCBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWQuXG4gICAgICAgICAgICBpZiAoYSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNT05USF0gPSBhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRNb250aCA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIERBWSBPRiBNT05USFxuICAgICAgICBjYXNlICdEJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBERFxuICAgICAgICBjYXNlICdERCcgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0RvJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbREFURV0gPSB0b0ludChwYXJzZUludChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5tYXRjaCgvXFxkezEsMn0vKVswXSwgMTApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgWUVBUlxuICAgICAgICBjYXNlICdEREQnIDogLy8gZmFsbCB0aHJvdWdoIHRvIERERERcbiAgICAgICAgY2FzZSAnRERERCcgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2RheU9mWWVhciA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFlFQVJcbiAgICAgICAgY2FzZSAnWVknIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbWUVBUl0gPSBtb21lbnQucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1lZWVknIDpcbiAgICAgICAgY2FzZSAnWVlZWVknIDpcbiAgICAgICAgY2FzZSAnWVlZWVlZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIEFNIC8gUE1cbiAgICAgICAgY2FzZSAnYScgOiAvLyBmYWxsIHRocm91Z2ggdG8gQVxuICAgICAgICBjYXNlICdBJyA6XG4gICAgICAgICAgICBjb25maWcuX2lzUG0gPSBjb25maWcuX2xvY2FsZS5pc1BNKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBIT1VSXG4gICAgICAgIGNhc2UgJ2gnIDogLy8gZmFsbCB0aHJvdWdoIHRvIGhoXG4gICAgICAgIGNhc2UgJ2hoJyA6XG4gICAgICAgICAgICBjb25maWcuX3BmLmJpZ0hvdXIgPSB0cnVlO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdIJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBISFxuICAgICAgICBjYXNlICdISCcgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtIT1VSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSU5VVEVcbiAgICAgICAgY2FzZSAnbScgOiAvLyBmYWxsIHRocm91Z2ggdG8gbW1cbiAgICAgICAgY2FzZSAnbW0nIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTUlOVVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBTRUNPTkRcbiAgICAgICAgY2FzZSAncycgOiAvLyBmYWxsIHRocm91Z2ggdG8gc3NcbiAgICAgICAgY2FzZSAnc3MnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbU0VDT05EXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSUxMSVNFQ09ORFxuICAgICAgICBjYXNlICdTJyA6XG4gICAgICAgIGNhc2UgJ1NTJyA6XG4gICAgICAgIGNhc2UgJ1NTUycgOlxuICAgICAgICBjYXNlICdTU1NTJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTExJU0VDT05EXSA9IHRvSW50KCgnMC4nICsgaW5wdXQpICogMTAwMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gVU5JWCBPRkZTRVQgKE1JTExJU0VDT05EUylcbiAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSh0b0ludChpbnB1dCkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggVElNRVNUQU1QIFdJVEggTVNcbiAgICAgICAgY2FzZSAnWCc6XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShwYXJzZUZsb2F0KGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFRJTUVaT05FXG4gICAgICAgIGNhc2UgJ1onIDogLy8gZmFsbCB0aHJvdWdoIHRvIFpaXG4gICAgICAgIGNhc2UgJ1paJyA6XG4gICAgICAgICAgICBjb25maWcuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX3R6bSA9IHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFdFRUtEQVkgLSBodW1hblxuICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgIGNhc2UgJ2RkZCc6XG4gICAgICAgIGNhc2UgJ2RkZGQnOlxuICAgICAgICAgICAgYSA9IGNvbmZpZy5fbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAgICAgLy8gaWYgd2UgZGlkbid0IGdldCBhIHdlZWtkYXkgbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkXG4gICAgICAgICAgICBpZiAoYSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1snZCddID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkV2Vla2RheSA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFdFRUssIFdFRUsgREFZIC0gbnVtZXJpY1xuICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnV1cnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zdWJzdHIoMCwgMSk7XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ2dnZ2cnOlxuICAgICAgICBjYXNlICdHR0dHJzpcbiAgICAgICAgY2FzZSAnR0dHR0cnOlxuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zdWJzdHIoMCwgMik7XG4gICAgICAgICAgICBpZiAoaW5wdXQpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICAgICAgY29uZmlnLl93W3Rva2VuXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0dHJzpcbiAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSBtb21lbnQucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtJbmZvKGNvbmZpZykge1xuICAgICAgICB2YXIgdywgd2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95LCB0ZW1wO1xuXG4gICAgICAgIHcgPSBjb25maWcuX3c7XG4gICAgICAgIGlmICh3LkdHICE9IG51bGwgfHwgdy5XICE9IG51bGwgfHwgdy5FICE9IG51bGwpIHtcbiAgICAgICAgICAgIGRvdyA9IDE7XG4gICAgICAgICAgICBkb3kgPSA0O1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBXZSBuZWVkIHRvIHRha2UgdGhlIGN1cnJlbnQgaXNvV2Vla1llYXIsIGJ1dCB0aGF0IGRlcGVuZHMgb25cbiAgICAgICAgICAgIC8vIGhvdyB3ZSBpbnRlcnByZXQgbm93IChsb2NhbCwgdXRjLCBmaXhlZCBvZmZzZXQpLiBTbyBjcmVhdGVcbiAgICAgICAgICAgIC8vIGEgbm93IHZlcnNpb24gb2YgY3VycmVudCBjb25maWcgKHRha2UgbG9jYWwvdXRjL29mZnNldCBmbGFncywgYW5kXG4gICAgICAgICAgICAvLyBjcmVhdGUgbm93KS5cbiAgICAgICAgICAgIHdlZWtZZWFyID0gZGZsKHcuR0csIGNvbmZpZy5fYVtZRUFSXSwgd2Vla09mWWVhcihtb21lbnQoKSwgMSwgNCkueWVhcik7XG4gICAgICAgICAgICB3ZWVrID0gZGZsKHcuVywgMSk7XG4gICAgICAgICAgICB3ZWVrZGF5ID0gZGZsKHcuRSwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb3cgPSBjb25maWcuX2xvY2FsZS5fd2Vlay5kb3c7XG4gICAgICAgICAgICBkb3kgPSBjb25maWcuX2xvY2FsZS5fd2Vlay5kb3k7XG5cbiAgICAgICAgICAgIHdlZWtZZWFyID0gZGZsKHcuZ2csIGNvbmZpZy5fYVtZRUFSXSwgd2Vla09mWWVhcihtb21lbnQoKSwgZG93LCBkb3kpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LncsIDEpO1xuXG4gICAgICAgICAgICBpZiAody5kICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyB3ZWVrZGF5IC0tIGxvdyBkYXkgbnVtYmVycyBhcmUgY29uc2lkZXJlZCBuZXh0IHdlZWtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5ID0gdy5kO1xuICAgICAgICAgICAgICAgIGlmICh3ZWVrZGF5IDwgZG93KSB7XG4gICAgICAgICAgICAgICAgICAgICsrd2VlaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHcuZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWwgd2Vla2RheSAtLSBjb3VudGluZyBzdGFydHMgZnJvbSBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZSArIGRvdztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IGRvdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0ZW1wID0gZGF5T2ZZZWFyRnJvbVdlZWtzKHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3ksIGRvdyk7XG5cbiAgICAgICAgY29uZmlnLl9hW1lFQVJdID0gdGVtcC55ZWFyO1xuICAgICAgICBjb25maWcuX2RheU9mWWVhciA9IHRlbXAuZGF5T2ZZZWFyO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgYW4gYXJyYXkgdG8gYSBkYXRlLlxuICAgIC8vIHRoZSBhcnJheSBzaG91bGQgbWlycm9yIHRoZSBwYXJhbWV0ZXJzIGJlbG93XG4gICAgLy8gbm90ZTogYWxsIHZhbHVlcyBwYXN0IHRoZSB5ZWFyIGFyZSBvcHRpb25hbCBhbmQgd2lsbCBkZWZhdWx0IHRvIHRoZSBsb3dlc3QgcG9zc2libGUgdmFsdWUuXG4gICAgLy8gW3llYXIsIG1vbnRoLCBkYXkgLCBob3VyLCBtaW51dGUsIHNlY29uZCwgbWlsbGlzZWNvbmRdXG4gICAgZnVuY3Rpb24gZGF0ZUZyb21Db25maWcoY29uZmlnKSB7XG4gICAgICAgIHZhciBpLCBkYXRlLCBpbnB1dCA9IFtdLCBjdXJyZW50RGF0ZSwgeWVhclRvVXNlO1xuXG4gICAgICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnREYXRlID0gY3VycmVudERhdGVBcnJheShjb25maWcpO1xuXG4gICAgICAgIC8vY29tcHV0ZSBkYXkgb2YgdGhlIHllYXIgZnJvbSB3ZWVrcyBhbmQgd2Vla2RheXNcbiAgICAgICAgaWYgKGNvbmZpZy5fdyAmJiBjb25maWcuX2FbREFURV0gPT0gbnVsbCAmJiBjb25maWcuX2FbTU9OVEhdID09IG51bGwpIHtcbiAgICAgICAgICAgIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9pZiB0aGUgZGF5IG9mIHRoZSB5ZWFyIGlzIHNldCwgZmlndXJlIG91dCB3aGF0IGl0IGlzXG4gICAgICAgIGlmIChjb25maWcuX2RheU9mWWVhcikge1xuICAgICAgICAgICAgeWVhclRvVXNlID0gZGZsKGNvbmZpZy5fYVtZRUFSXSwgY3VycmVudERhdGVbWUVBUl0pO1xuXG4gICAgICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIgPiBkYXlzSW5ZZWFyKHllYXJUb1VzZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLl9vdmVyZmxvd0RheU9mWWVhciA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGUgPSBtYWtlVVRDRGF0ZSh5ZWFyVG9Vc2UsIDAsIGNvbmZpZy5fZGF5T2ZZZWFyKTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtNT05USF0gPSBkYXRlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICBjb25maWcuX2FbREFURV0gPSBkYXRlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY3VycmVudCBkYXRlLlxuICAgICAgICAvLyAqIGlmIG5vIHllYXIsIG1vbnRoLCBkYXkgb2YgbW9udGggYXJlIGdpdmVuLCBkZWZhdWx0IHRvIHRvZGF5XG4gICAgICAgIC8vICogaWYgZGF5IG9mIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG1vbnRoIGFuZCB5ZWFyXG4gICAgICAgIC8vICogaWYgbW9udGggaXMgZ2l2ZW4sIGRlZmF1bHQgb25seSB5ZWFyXG4gICAgICAgIC8vICogaWYgeWVhciBpcyBnaXZlbiwgZG9uJ3QgZGVmYXVsdCBhbnl0aGluZ1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMyAmJiBjb25maWcuX2FbaV0gPT0gbnVsbDsgKytpKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IGN1cnJlbnREYXRlW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gWmVybyBvdXQgd2hhdGV2ZXIgd2FzIG5vdCBkZWZhdWx0ZWQsIGluY2x1ZGluZyB0aW1lXG4gICAgICAgIGZvciAoOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IChjb25maWcuX2FbaV0gPT0gbnVsbCkgPyAoaSA9PT0gMiA/IDEgOiAwKSA6IGNvbmZpZy5fYVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciAyNDowMDowMC4wMDBcbiAgICAgICAgaWYgKGNvbmZpZy5fYVtIT1VSXSA9PT0gMjQgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbTUlOVVRFXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtTRUNPTkRdID09PSAwICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTExJU0VDT05EXSA9PT0gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9uZXh0RGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2QgPSAoY29uZmlnLl91c2VVVEMgPyBtYWtlVVRDRGF0ZSA6IG1ha2VEYXRlKS5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgICAgIC8vIEFwcGx5IHRpbWV6b25lIG9mZnNldCBmcm9tIGlucHV0LiBUaGUgYWN0dWFsIHpvbmUgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgLy8gd2l0aCBwYXJzZVpvbmUuXG4gICAgICAgIGlmIChjb25maWcuX3R6bSAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpICsgY29uZmlnLl90em0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fbmV4dERheSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMjQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXRlRnJvbU9iamVjdChjb25maWcpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dDtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhjb25maWcuX2kpO1xuICAgICAgICBjb25maWcuX2EgPSBbXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQueWVhcixcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5tb250aCxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgbm9ybWFsaXplZElucHV0LmRhdGUsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuaG91cixcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5taW51dGUsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuc2Vjb25kLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kXG4gICAgICAgIF07XG5cbiAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjdXJyZW50RGF0ZUFycmF5KGNvbmZpZykge1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDKSB7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENGdWxsWWVhcigpLFxuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENNb250aCgpLFxuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENEYXRlKClcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW25vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gc3RyaW5nIGFuZCBmb3JtYXQgc3RyaW5nXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnLl9mID09PSBtb21lbnQuSVNPXzg2MDEpIHtcbiAgICAgICAgICAgIHBhcnNlSVNPKGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2EgPSBbXTtcbiAgICAgICAgY29uZmlnLl9wZi5lbXB0eSA9IHRydWU7XG5cbiAgICAgICAgLy8gVGhpcyBhcnJheSBpcyB1c2VkIHRvIG1ha2UgYSBEYXRlLCBlaXRoZXIgd2l0aCBgbmV3IERhdGVgIG9yIGBEYXRlLlVUQ2BcbiAgICAgICAgdmFyIHN0cmluZyA9ICcnICsgY29uZmlnLl9pLFxuICAgICAgICAgICAgaSwgcGFyc2VkSW5wdXQsIHRva2VucywgdG9rZW4sIHNraXBwZWQsXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCA9IDA7XG5cbiAgICAgICAgdG9rZW5zID0gZXhwYW5kRm9ybWF0KGNvbmZpZy5fZiwgY29uZmlnLl9sb2NhbGUpLm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpIHx8IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICAgICAgcGFyc2VkSW5wdXQgPSAoc3RyaW5nLm1hdGNoKGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSkgfHwgW10pWzBdO1xuICAgICAgICAgICAgaWYgKHBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2tpcHBlZCA9IHN0cmluZy5zdWJzdHIoMCwgc3RyaW5nLmluZGV4T2YocGFyc2VkSW5wdXQpKTtcbiAgICAgICAgICAgICAgICBpZiAoc2tpcHBlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkSW5wdXQucHVzaChza2lwcGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSArIHBhcnNlZElucHV0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCArPSBwYXJzZWRJbnB1dC5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkb24ndCBwYXJzZSBpZiBpdCdzIG5vdCBhIGtub3duIHRva2VuXG4gICAgICAgICAgICBpZiAoZm9ybWF0VG9rZW5GdW5jdGlvbnNbdG9rZW5dKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuZW1wdHkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgcGFyc2VkSW5wdXQsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjb25maWcuX3N0cmljdCAmJiAhcGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCByZW1haW5pbmcgdW5wYXJzZWQgaW5wdXQgbGVuZ3RoIHRvIHRoZSBzdHJpbmdcbiAgICAgICAgY29uZmlnLl9wZi5jaGFyc0xlZnRPdmVyID0gc3RyaW5nTGVuZ3RoIC0gdG90YWxQYXJzZWRJbnB1dExlbmd0aDtcbiAgICAgICAgaWYgKHN0cmluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZElucHV0LnB1c2goc3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIF8xMmggZmxhZyBpZiBob3VyIGlzIDw9IDEyXG4gICAgICAgIGlmIChjb25maWcuX3BmLmJpZ0hvdXIgPT09IHRydWUgJiYgY29uZmlnLl9hW0hPVVJdIDw9IDEyKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmJpZ0hvdXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaGFuZGxlIGFtIHBtXG4gICAgICAgIGlmIChjb25maWcuX2lzUG0gJiYgY29uZmlnLl9hW0hPVVJdIDwgMTIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSArPSAxMjtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBpcyAxMiBhbSwgY2hhbmdlIGhvdXJzIHRvIDBcbiAgICAgICAgaWYgKGNvbmZpZy5faXNQbSA9PT0gZmFsc2UgJiYgY29uZmlnLl9hW0hPVVJdID09PSAxMikge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMDtcbiAgICAgICAgfVxuICAgICAgICBkYXRlRnJvbUNvbmZpZyhjb25maWcpO1xuICAgICAgICBjaGVja092ZXJmbG93KGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5lc2NhcGVGb3JtYXQocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXFxcKFxcWyl8XFxcXChcXF0pfFxcWyhbXlxcXVxcW10qKVxcXXxcXFxcKC4pL2csIGZ1bmN0aW9uIChtYXRjaGVkLCBwMSwgcDIsIHAzLCBwNCkge1xuICAgICAgICAgICAgcmV0dXJuIHAxIHx8IHAyIHx8IHAzIHx8IHA0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDb2RlIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTYxNDkzL2lzLXRoZXJlLWEtcmVnZXhwLWVzY2FwZS1mdW5jdGlvbi1pbi1qYXZhc2NyaXB0XG4gICAgZnVuY3Rpb24gcmVnZXhwRXNjYXBlKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgYXJyYXkgb2YgZm9ybWF0IHN0cmluZ3NcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmdBbmRBcnJheShjb25maWcpIHtcbiAgICAgICAgdmFyIHRlbXBDb25maWcsXG4gICAgICAgICAgICBiZXN0TW9tZW50LFxuXG4gICAgICAgICAgICBzY29yZVRvQmVhdCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBjdXJyZW50U2NvcmU7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZEZvcm1hdCA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShOYU4pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbmZpZy5fZi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY3VycmVudFNjb3JlID0gMDtcbiAgICAgICAgICAgIHRlbXBDb25maWcgPSBjb3B5Q29uZmlnKHt9LCBjb25maWcpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZW1wQ29uZmlnLl91c2VVVEMgPSBjb25maWcuX3VzZVVUQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuICAgICAgICAgICAgdGVtcENvbmZpZy5fZiA9IGNvbmZpZy5fZltpXTtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdCh0ZW1wQ29uZmlnKTtcblxuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKHRlbXBDb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGFueSBpbnB1dCB0aGF0IHdhcyBub3QgcGFyc2VkIGFkZCBhIHBlbmFsdHkgZm9yIHRoYXQgZm9ybWF0XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gdGVtcENvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlcjtcblxuICAgICAgICAgICAgLy9vciB0b2tlbnNcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSArPSB0ZW1wQ29uZmlnLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoICogMTA7XG5cbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmLnNjb3JlID0gY3VycmVudFNjb3JlO1xuXG4gICAgICAgICAgICBpZiAoc2NvcmVUb0JlYXQgPT0gbnVsbCB8fCBjdXJyZW50U2NvcmUgPCBzY29yZVRvQmVhdCkge1xuICAgICAgICAgICAgICAgIHNjb3JlVG9CZWF0ID0gY3VycmVudFNjb3JlO1xuICAgICAgICAgICAgICAgIGJlc3RNb21lbnQgPSB0ZW1wQ29uZmlnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5kKGNvbmZpZywgYmVzdE1vbWVudCB8fCB0ZW1wQ29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdFxuICAgIGZ1bmN0aW9uIHBhcnNlSVNPKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgbCxcbiAgICAgICAgICAgIHN0cmluZyA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIG1hdGNoID0gaXNvUmVnZXguZXhlYyhzdHJpbmcpO1xuXG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5pc28gPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb0RhdGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29EYXRlc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hbNV0gc2hvdWxkIGJlICdUJyBvciB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9mID0gaXNvRGF0ZXNbaV1bMF0gKyAobWF0Y2hbNl0gfHwgJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb1RpbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29UaW1lc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9mICs9IGlzb1RpbWVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RyaW5nLm1hdGNoKHBhcnNlVG9rZW5UaW1lem9uZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2YgKz0gJ1onO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0IG9yIGZhbGxiYWNrXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZykge1xuICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnLl9pc1ZhbGlkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIGNvbmZpZy5faXNWYWxpZDtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwKGFyciwgZm4pIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdLCBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZXMucHVzaChmbihhcnJbaV0sIGkpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbUlucHV0KGNvbmZpZykge1xuICAgICAgICB2YXIgaW5wdXQgPSBjb25maWcuX2ksIG1hdGNoZWQ7XG4gICAgICAgIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGF0ZShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCtpbnB1dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoKG1hdGNoZWQgPSBhc3BOZXRKc29uUmVnZXguZXhlYyhpbnB1dCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgrbWF0Y2hlZFsxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYSA9IG1hcChpbnB1dC5zbGljZSgwKSwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChvYmosIDEwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZGF0ZUZyb21PYmplY3QoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgLy8gZnJvbSBtaWxsaXNlY29uZHNcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGlucHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZURhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpIHtcbiAgICAgICAgLy9jYW4ndCBqdXN0IGFwcGx5KCkgdG8gY3JlYXRlIGEgZGF0ZTpcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MTM0OC9pbnN0YW50aWF0aW5nLWEtamF2YXNjcmlwdC1vYmplY3QtYnktY2FsbGluZy1wcm90b3R5cGUtY29uc3RydWN0b3ItYXBwbHlcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcyk7XG5cbiAgICAgICAgLy90aGUgZGF0ZSBjb25zdHJ1Y3RvciBkb2Vzbid0IGFjY2VwdCB5ZWFycyA8IDE5NzBcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VVVENEYXRlKHkpIHtcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQy5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShpbnB1dCwgbG9jYWxlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoIWlzTmFOKGlucHV0KSkge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gcGFyc2VJbnQoaW5wdXQsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBSZWxhdGl2ZSBUaW1lXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBoZWxwZXIgZnVuY3Rpb24gZm9yIG1vbWVudC5mbi5mcm9tLCBtb21lbnQuZm4uZnJvbU5vdywgYW5kIG1vbWVudC5kdXJhdGlvbi5mbi5odW1hbml6ZVxuICAgIGZ1bmN0aW9uIHN1YnN0aXR1dGVUaW1lQWdvKHN0cmluZywgbnVtYmVyLCB3aXRob3V0U3VmZml4LCBpc0Z1dHVyZSwgbG9jYWxlKSB7XG4gICAgICAgIHJldHVybiBsb2NhbGUucmVsYXRpdmVUaW1lKG51bWJlciB8fCAxLCAhIXdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbGF0aXZlVGltZShwb3NOZWdEdXJhdGlvbiwgd2l0aG91dFN1ZmZpeCwgbG9jYWxlKSB7XG4gICAgICAgIHZhciBkdXJhdGlvbiA9IG1vbWVudC5kdXJhdGlvbihwb3NOZWdEdXJhdGlvbikuYWJzKCksXG4gICAgICAgICAgICBzZWNvbmRzID0gcm91bmQoZHVyYXRpb24uYXMoJ3MnKSksXG4gICAgICAgICAgICBtaW51dGVzID0gcm91bmQoZHVyYXRpb24uYXMoJ20nKSksXG4gICAgICAgICAgICBob3VycyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdoJykpLFxuICAgICAgICAgICAgZGF5cyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdkJykpLFxuICAgICAgICAgICAgbW9udGhzID0gcm91bmQoZHVyYXRpb24uYXMoJ00nKSksXG4gICAgICAgICAgICB5ZWFycyA9IHJvdW5kKGR1cmF0aW9uLmFzKCd5JykpLFxuXG4gICAgICAgICAgICBhcmdzID0gc2Vjb25kcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMucyAmJiBbJ3MnLCBzZWNvbmRzXSB8fFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPT09IDEgJiYgWydtJ10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5tICYmIFsnbW0nLCBtaW51dGVzXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzID09PSAxICYmIFsnaCddIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmggJiYgWydoaCcsIGhvdXJzXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPT09IDEgJiYgWydkJ10gfHxcbiAgICAgICAgICAgICAgICBkYXlzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5kICYmIFsnZGQnLCBkYXlzXSB8fFxuICAgICAgICAgICAgICAgIG1vbnRocyA9PT0gMSAmJiBbJ00nXSB8fFxuICAgICAgICAgICAgICAgIG1vbnRocyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuTSAmJiBbJ01NJywgbW9udGhzXSB8fFxuICAgICAgICAgICAgICAgIHllYXJzID09PSAxICYmIFsneSddIHx8IFsneXknLCB5ZWFyc107XG5cbiAgICAgICAgYXJnc1syXSA9IHdpdGhvdXRTdWZmaXg7XG4gICAgICAgIGFyZ3NbM10gPSArcG9zTmVnRHVyYXRpb24gPiAwO1xuICAgICAgICBhcmdzWzRdID0gbG9jYWxlO1xuICAgICAgICByZXR1cm4gc3Vic3RpdHV0ZVRpbWVBZ28uYXBwbHkoe30sIGFyZ3MpO1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBXZWVrIG9mIFllYXJcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGZpcnN0RGF5T2ZXZWVrICAgICAgIDAgPSBzdW4sIDYgPSBzYXRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZGF5IG9mIHRoZSB3ZWVrIHRoYXQgc3RhcnRzIHRoZSB3ZWVrXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgKHVzdWFsbHkgc3VuZGF5IG9yIG1vbmRheSlcbiAgICAvLyBmaXJzdERheU9mV2Vla09mWWVhciAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGZpcnN0IHdlZWsgaXMgdGhlIHdlZWsgdGhhdCBjb250YWlucyB0aGUgZmlyc3RcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBvZiB0aGlzIGRheSBvZiB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIChlZy4gSVNPIHdlZWtzIHVzZSB0aHVyc2RheSAoNCkpXG4gICAgZnVuY3Rpb24gd2Vla09mWWVhcihtb20sIGZpcnN0RGF5T2ZXZWVrLCBmaXJzdERheU9mV2Vla09mWWVhcikge1xuICAgICAgICB2YXIgZW5kID0gZmlyc3REYXlPZldlZWtPZlllYXIgLSBmaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gbW9tLmRheSgpLFxuICAgICAgICAgICAgYWRqdXN0ZWRNb21lbnQ7XG5cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrID4gZW5kKSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgLT0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzVG9EYXlPZldlZWsgPCBlbmQgLSA3KSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgKz0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGFkanVzdGVkTW9tZW50ID0gbW9tZW50KG1vbSkuYWRkKGRheXNUb0RheU9mV2VlaywgJ2QnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdlZWs6IE1hdGguY2VpbChhZGp1c3RlZE1vbWVudC5kYXlPZlllYXIoKSAvIDcpLFxuICAgICAgICAgICAgeWVhcjogYWRqdXN0ZWRNb21lbnQueWVhcigpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy9odHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0lTT193ZWVrX2RhdGUjQ2FsY3VsYXRpbmdfYV9kYXRlX2dpdmVuX3RoZV95ZWFyLjJDX3dlZWtfbnVtYmVyX2FuZF93ZWVrZGF5XG4gICAgZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtzKHllYXIsIHdlZWssIHdlZWtkYXksIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyLCBmaXJzdERheU9mV2Vlaykge1xuICAgICAgICB2YXIgZCA9IG1ha2VVVENEYXRlKHllYXIsIDAsIDEpLmdldFVUQ0RheSgpLCBkYXlzVG9BZGQsIGRheU9mWWVhcjtcblxuICAgICAgICBkID0gZCA9PT0gMCA/IDcgOiBkO1xuICAgICAgICB3ZWVrZGF5ID0gd2Vla2RheSAhPSBudWxsID8gd2Vla2RheSA6IGZpcnN0RGF5T2ZXZWVrO1xuICAgICAgICBkYXlzVG9BZGQgPSBmaXJzdERheU9mV2VlayAtIGQgKyAoZCA+IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyID8gNyA6IDApIC0gKGQgPCBmaXJzdERheU9mV2VlayA/IDcgOiAwKTtcbiAgICAgICAgZGF5T2ZZZWFyID0gNyAqICh3ZWVrIC0gMSkgKyAod2Vla2RheSAtIGZpcnN0RGF5T2ZXZWVrKSArIGRheXNUb0FkZCArIDE7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHllYXI6IGRheU9mWWVhciA+IDAgPyB5ZWFyIDogeWVhciAtIDEsXG4gICAgICAgICAgICBkYXlPZlllYXI6IGRheU9mWWVhciA+IDAgPyAgZGF5T2ZZZWFyIDogZGF5c0luWWVhcih5ZWFyIC0gMSkgKyBkYXlPZlllYXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFRvcCBMZXZlbCBGdW5jdGlvbnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBtYWtlTW9tZW50KGNvbmZpZykge1xuICAgICAgICB2YXIgaW5wdXQgPSBjb25maWcuX2ksXG4gICAgICAgICAgICBmb3JtYXQgPSBjb25maWcuX2YsXG4gICAgICAgICAgICByZXM7XG5cbiAgICAgICAgY29uZmlnLl9sb2NhbGUgPSBjb25maWcuX2xvY2FsZSB8fCBtb21lbnQubG9jYWxlRGF0YShjb25maWcuX2wpO1xuXG4gICAgICAgIGlmIChpbnB1dCA9PT0gbnVsbCB8fCAoZm9ybWF0ID09PSB1bmRlZmluZWQgJiYgaW5wdXQgPT09ICcnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5pbnZhbGlkKHtudWxsSW5wdXQ6IHRydWV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25maWcuX2kgPSBpbnB1dCA9IGNvbmZpZy5fbG9jYWxlLnByZXBhcnNlKGlucHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb21lbnQuaXNNb21lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1vbWVudChpbnB1dCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0KSB7XG4gICAgICAgICAgICBpZiAoaXNBcnJheShmb3JtYXQpKSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzID0gbmV3IE1vbWVudChjb25maWcpO1xuICAgICAgICBpZiAocmVzLl9uZXh0RGF5KSB7XG4gICAgICAgICAgICAvLyBBZGRpbmcgaXMgc21hcnQgZW5vdWdoIGFyb3VuZCBEU1RcbiAgICAgICAgICAgIHJlcy5hZGQoMSwgJ2QnKTtcbiAgICAgICAgICAgIHJlcy5fbmV4dERheSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgbW9tZW50ID0gZnVuY3Rpb24gKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgICAgIHZhciBjO1xuXG4gICAgICAgIGlmICh0eXBlb2YobG9jYWxlKSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBzdHJpY3QgPSBsb2NhbGU7XG4gICAgICAgICAgICBsb2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDIzXG4gICAgICAgIGMgPSB7fTtcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5faSA9IGlucHV0O1xuICAgICAgICBjLl9mID0gZm9ybWF0O1xuICAgICAgICBjLl9sID0gbG9jYWxlO1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGMuX2lzVVRDID0gZmFsc2U7XG4gICAgICAgIGMuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuXG4gICAgICAgIHJldHVybiBtYWtlTW9tZW50KGMpO1xuICAgIH07XG5cbiAgICBtb21lbnQuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID0gZmFsc2U7XG5cbiAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2sgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQgY29uc3RydWN0aW9uIGZhbGxzIGJhY2sgdG8ganMgRGF0ZS4gVGhpcyBpcyAnICtcbiAgICAgICAgJ2Rpc2NvdXJhZ2VkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdXBjb21pbmcgbWFqb3IgJyArXG4gICAgICAgICdyZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gJyArXG4gICAgICAgICdodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQwNyBmb3IgbW9yZSBpbmZvLicsXG4gICAgICAgIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGNvbmZpZy5faSArIChjb25maWcuX3VzZVVUQyA/ICcgVVRDJyA6ICcnKSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gUGljayBhIG1vbWVudCBtIGZyb20gbW9tZW50cyBzbyB0aGF0IG1bZm5dKG90aGVyKSBpcyB0cnVlIGZvciBhbGxcbiAgICAvLyBvdGhlci4gVGhpcyByZWxpZXMgb24gdGhlIGZ1bmN0aW9uIGZuIHRvIGJlIHRyYW5zaXRpdmUuXG4gICAgLy9cbiAgICAvLyBtb21lbnRzIHNob3VsZCBlaXRoZXIgYmUgYW4gYXJyYXkgb2YgbW9tZW50IG9iamVjdHMgb3IgYW4gYXJyYXksIHdob3NlXG4gICAgLy8gZmlyc3QgZWxlbWVudCBpcyBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cy5cbiAgICBmdW5jdGlvbiBwaWNrQnkoZm4sIG1vbWVudHMpIHtcbiAgICAgICAgdmFyIHJlcywgaTtcbiAgICAgICAgaWYgKG1vbWVudHMubGVuZ3RoID09PSAxICYmIGlzQXJyYXkobW9tZW50c1swXSkpIHtcbiAgICAgICAgICAgIG1vbWVudHMgPSBtb21lbnRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbW9tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXMgPSBtb21lbnRzWzBdO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbW9tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG1vbWVudHNbaV1bZm5dKHJlcykpIHtcbiAgICAgICAgICAgICAgICByZXMgPSBtb21lbnRzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgbW9tZW50Lm1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICAgICAgcmV0dXJuIHBpY2tCeSgnaXNCZWZvcmUnLCBhcmdzKTtcbiAgICB9O1xuXG4gICAgbW9tZW50Lm1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICAgICAgcmV0dXJuIHBpY2tCeSgnaXNBZnRlcicsIGFyZ3MpO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGluZyB3aXRoIHV0Y1xuICAgIG1vbWVudC51dGMgPSBmdW5jdGlvbiAoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIGM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihsb2NhbGUpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxvY2FsZTtcbiAgICAgICAgICAgIGxvY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBvYmplY3QgY29uc3RydWN0aW9uIG11c3QgYmUgZG9uZSB0aGlzIHdheS5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICAgICAgYyA9IHt9O1xuICAgICAgICBjLl9pc0FNb21lbnRPYmplY3QgPSB0cnVlO1xuICAgICAgICBjLl91c2VVVEMgPSB0cnVlO1xuICAgICAgICBjLl9pc1VUQyA9IHRydWU7XG4gICAgICAgIGMuX2wgPSBsb2NhbGU7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fc3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBjLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcblxuICAgICAgICByZXR1cm4gbWFrZU1vbWVudChjKS51dGMoKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1bml4IHRpbWVzdGFtcCAoaW4gc2Vjb25kcylcbiAgICBtb21lbnQudW5peCA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0ICogMTAwMCk7XG4gICAgfTtcblxuICAgIC8vIGR1cmF0aW9uXG4gICAgbW9tZW50LmR1cmF0aW9uID0gZnVuY3Rpb24gKGlucHV0LCBrZXkpIHtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gaW5wdXQsXG4gICAgICAgICAgICAvLyBtYXRjaGluZyBhZ2FpbnN0IHJlZ2V4cCBpcyBleHBlbnNpdmUsIGRvIGl0IG9uIGRlbWFuZFxuICAgICAgICAgICAgbWF0Y2ggPSBudWxsLFxuICAgICAgICAgICAgc2lnbixcbiAgICAgICAgICAgIHJldCxcbiAgICAgICAgICAgIHBhcnNlSXNvLFxuICAgICAgICAgICAgZGlmZlJlcztcblxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXQpKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBtczogaW5wdXQuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkOiBpbnB1dC5fZGF5cyxcbiAgICAgICAgICAgICAgICBNOiBpbnB1dC5fbW9udGhzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge307XG4gICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb25ba2V5XSA9IGlucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbi5taWxsaXNlY29uZHMgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghIShtYXRjaCA9IGFzcE5ldFRpbWVTcGFuSnNvblJlZ2V4LmV4ZWMoaW5wdXQpKSkge1xuICAgICAgICAgICAgc2lnbiA9IChtYXRjaFsxXSA9PT0gJy0nKSA/IC0xIDogMTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgZDogdG9JbnQobWF0Y2hbREFURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBoOiB0b0ludChtYXRjaFtIT1VSXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG06IHRvSW50KG1hdGNoW01JTlVURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBzOiB0b0ludChtYXRjaFtTRUNPTkRdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgbXM6IHRvSW50KG1hdGNoW01JTExJU0VDT05EXSkgKiBzaWduXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gaXNvRHVyYXRpb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBwYXJzZUlzbyA9IGZ1bmN0aW9uIChpbnApIHtcbiAgICAgICAgICAgICAgICAvLyBXZSdkIG5vcm1hbGx5IHVzZSB+fmlucCBmb3IgdGhpcywgYnV0IHVuZm9ydHVuYXRlbHkgaXQgYWxzb1xuICAgICAgICAgICAgICAgIC8vIGNvbnZlcnRzIGZsb2F0cyB0byBpbnRzLlxuICAgICAgICAgICAgICAgIC8vIGlucCBtYXkgYmUgdW5kZWZpbmVkLCBzbyBjYXJlZnVsIGNhbGxpbmcgcmVwbGFjZSBvbiBpdC5cbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gaW5wICYmIHBhcnNlRmxvYXQoaW5wLnJlcGxhY2UoJywnLCAnLicpKTtcbiAgICAgICAgICAgICAgICAvLyBhcHBseSBzaWduIHdoaWxlIHdlJ3JlIGF0IGl0XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpc05hTihyZXMpID8gMCA6IHJlcykgKiBzaWduO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IHBhcnNlSXNvKG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBNOiBwYXJzZUlzbyhtYXRjaFszXSksXG4gICAgICAgICAgICAgICAgZDogcGFyc2VJc28obWF0Y2hbNF0pLFxuICAgICAgICAgICAgICAgIGg6IHBhcnNlSXNvKG1hdGNoWzVdKSxcbiAgICAgICAgICAgICAgICBtOiBwYXJzZUlzbyhtYXRjaFs2XSksXG4gICAgICAgICAgICAgICAgczogcGFyc2VJc28obWF0Y2hbN10pLFxuICAgICAgICAgICAgICAgIHc6IHBhcnNlSXNvKG1hdGNoWzhdKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZHVyYXRpb24gPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgICAgICAgKCdmcm9tJyBpbiBkdXJhdGlvbiB8fCAndG8nIGluIGR1cmF0aW9uKSkge1xuICAgICAgICAgICAgZGlmZlJlcyA9IG1vbWVudHNEaWZmZXJlbmNlKG1vbWVudChkdXJhdGlvbi5mcm9tKSwgbW9tZW50KGR1cmF0aW9uLnRvKSk7XG5cbiAgICAgICAgICAgIGR1cmF0aW9uID0ge307XG4gICAgICAgICAgICBkdXJhdGlvbi5tcyA9IGRpZmZSZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgZHVyYXRpb24uTSA9IGRpZmZSZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0ID0gbmV3IER1cmF0aW9uKGR1cmF0aW9uKTtcblxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXQpICYmIGhhc093blByb3AoaW5wdXQsICdfbG9jYWxlJykpIHtcbiAgICAgICAgICAgIHJldC5fbG9jYWxlID0gaW5wdXQuX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIC8vIHZlcnNpb24gbnVtYmVyXG4gICAgbW9tZW50LnZlcnNpb24gPSBWRVJTSU9OO1xuXG4gICAgLy8gZGVmYXVsdCBmb3JtYXRcbiAgICBtb21lbnQuZGVmYXVsdEZvcm1hdCA9IGlzb0Zvcm1hdDtcblxuICAgIC8vIGNvbnN0YW50IHRoYXQgcmVmZXJzIHRvIHRoZSBJU08gc3RhbmRhcmRcbiAgICBtb21lbnQuSVNPXzg2MDEgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIFBsdWdpbnMgdGhhdCBhZGQgcHJvcGVydGllcyBzaG91bGQgYWxzbyBhZGQgdGhlIGtleSBoZXJlIChudWxsIHZhbHVlKSxcbiAgICAvLyBzbyB3ZSBjYW4gcHJvcGVybHkgY2xvbmUgb3Vyc2VsdmVzLlxuICAgIG1vbWVudC5tb21lbnRQcm9wZXJ0aWVzID0gbW9tZW50UHJvcGVydGllcztcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBtb21lbnQgaXMgbXV0YXRlZC5cbiAgICAvLyBJdCBpcyBpbnRlbmRlZCB0byBrZWVwIHRoZSBvZmZzZXQgaW4gc3luYyB3aXRoIHRoZSB0aW1lem9uZS5cbiAgICBtb21lbnQudXBkYXRlT2Zmc2V0ID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyB5b3UgdG8gc2V0IGEgdGhyZXNob2xkIGZvciByZWxhdGl2ZSB0aW1lIHN0cmluZ3NcbiAgICBtb21lbnQucmVsYXRpdmVUaW1lVGhyZXNob2xkID0gZnVuY3Rpb24gKHRocmVzaG9sZCwgbGltaXQpIHtcbiAgICAgICAgaWYgKHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbWl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF07XG4gICAgICAgIH1cbiAgICAgICAgcmVsYXRpdmVUaW1lVGhyZXNob2xkc1t0aHJlc2hvbGRdID0gbGltaXQ7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBtb21lbnQubGFuZyA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudC5sYW5nIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlIGluc3RlYWQuJyxcbiAgICAgICAgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQubG9jYWxlKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBsb2FkIGxvY2FsZSBhbmQgdGhlbiBzZXQgdGhlIGdsb2JhbCBsb2NhbGUuICBJZlxuICAgIC8vIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLCBpdCB3aWxsIHNpbXBseSByZXR1cm4gdGhlIGN1cnJlbnQgZ2xvYmFsXG4gICAgLy8gbG9jYWxlIGtleS5cbiAgICBtb21lbnQubG9jYWxlID0gZnVuY3Rpb24gKGtleSwgdmFsdWVzKSB7XG4gICAgICAgIHZhciBkYXRhO1xuICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mKHZhbHVlcykgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG1vbWVudC5kZWZpbmVMb2NhbGUoa2V5LCB2YWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgbW9tZW50LmR1cmF0aW9uLl9sb2NhbGUgPSBtb21lbnQuX2xvY2FsZSA9IGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9tZW50Ll9sb2NhbGUuX2FiYnI7XG4gICAgfTtcblxuICAgIG1vbWVudC5kZWZpbmVMb2NhbGUgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlcy5hYmJyID0gbmFtZTtcbiAgICAgICAgICAgIGlmICghbG9jYWxlc1tuYW1lXSkge1xuICAgICAgICAgICAgICAgIGxvY2FsZXNbbmFtZV0gPSBuZXcgTG9jYWxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2NhbGVzW25hbWVdLnNldCh2YWx1ZXMpO1xuXG4gICAgICAgICAgICAvLyBiYWNrd2FyZHMgY29tcGF0IGZvciBub3c6IGFsc28gc2V0IHRoZSBsb2NhbGVcbiAgICAgICAgICAgIG1vbWVudC5sb2NhbGUobmFtZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdXNlZnVsIGZvciB0ZXN0aW5nXG4gICAgICAgICAgICBkZWxldGUgbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1vbWVudC5sYW5nRGF0YSA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudC5sYW5nRGF0YSBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZURhdGEgaW5zdGVhZC4nLFxuICAgICAgICBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmxvY2FsZURhdGEoa2V5KTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyByZXR1cm5zIGxvY2FsZSBkYXRhXG4gICAgbW9tZW50LmxvY2FsZURhdGEgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHZhciBsb2NhbGU7XG5cbiAgICAgICAgaWYgKGtleSAmJiBrZXkuX2xvY2FsZSAmJiBrZXkuX2xvY2FsZS5fYWJicikge1xuICAgICAgICAgICAga2V5ID0ga2V5Ll9sb2NhbGUuX2FiYnI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5fbG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KGtleSkpIHtcbiAgICAgICAgICAgIC8vc2hvcnQtY2lyY3VpdCBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgICAgIGxvY2FsZSA9IGxvYWRMb2NhbGUoa2V5KTtcbiAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5ID0gW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hvb3NlTG9jYWxlKGtleSk7XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUgbW9tZW50IG9iamVjdFxuICAgIG1vbWVudC5pc01vbWVudCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIE1vbWVudCB8fFxuICAgICAgICAgICAgKG9iaiAhPSBudWxsICYmIGhhc093blByb3Aob2JqLCAnX2lzQU1vbWVudE9iamVjdCcpKTtcbiAgICB9O1xuXG4gICAgLy8gZm9yIHR5cGVjaGVja2luZyBEdXJhdGlvbiBvYmplY3RzXG4gICAgbW9tZW50LmlzRHVyYXRpb24gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBEdXJhdGlvbjtcbiAgICB9O1xuXG4gICAgZm9yIChpID0gbGlzdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgbWFrZUxpc3QobGlzdHNbaV0pO1xuICAgIH1cblxuICAgIG1vbWVudC5ub3JtYWxpemVVbml0cyA9IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgIH07XG5cbiAgICBtb21lbnQuaW52YWxpZCA9IGZ1bmN0aW9uIChmbGFncykge1xuICAgICAgICB2YXIgbSA9IG1vbWVudC51dGMoTmFOKTtcbiAgICAgICAgaWYgKGZsYWdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGV4dGVuZChtLl9wZiwgZmxhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbS5fcGYudXNlckludmFsaWRhdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtO1xuICAgIH07XG5cbiAgICBtb21lbnQucGFyc2Vab25lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cykucGFyc2Vab25lKCk7XG4gICAgfTtcblxuICAgIG1vbWVudC5wYXJzZVR3b0RpZ2l0WWVhciA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gdG9JbnQoaW5wdXQpICsgKHRvSW50KGlucHV0KSA+IDY4ID8gMTkwMCA6IDIwMDApO1xuICAgIH07XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIE1vbWVudCBQcm90b3R5cGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChtb21lbnQuZm4gPSBNb21lbnQucHJvdG90eXBlLCB7XG5cbiAgICAgICAgY2xvbmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZhbHVlT2YgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMuX2QgKyAoKHRoaXMuX29mZnNldCB8fCAwKSAqIDYwMDAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1bml4IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoK3RoaXMgLyAxMDAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb25lKCkubG9jYWxlKCdlbicpLmZvcm1hdCgnZGRkIE1NTSBERCBZWVlZIEhIOm1tOnNzIFtHTVRdWlonKTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0RhdGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0ID8gbmV3IERhdGUoK3RoaXMpIDogdGhpcy5fZDtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0lTT1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtID0gbW9tZW50KHRoaXMpLnV0YygpO1xuICAgICAgICAgICAgaWYgKDAgPCBtLnllYXIoKSAmJiBtLnllYXIoKSA8PSA5OTk5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb24gaXMgfjUweCBmYXN0ZXIsIHVzZSBpdCB3aGVuIHdlIGNhblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0RhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1taXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHRvQXJyYXkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIG0ueWVhcigpLFxuICAgICAgICAgICAgICAgIG0ubW9udGgoKSxcbiAgICAgICAgICAgICAgICBtLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBtLmhvdXJzKCksXG4gICAgICAgICAgICAgICAgbS5taW51dGVzKCksXG4gICAgICAgICAgICAgICAgbS5zZWNvbmRzKCksXG4gICAgICAgICAgICAgICAgbS5taWxsaXNlY29uZHMoKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1ZhbGlkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWQodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1RTaGlmdGVkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2EpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgY29tcGFyZUFycmF5cyh0aGlzLl9hLCAodGhpcy5faXNVVEMgPyBtb21lbnQudXRjKHRoaXMuX2EpIDogbW9tZW50KHRoaXMuX2EpKS50b0FycmF5KCkpID4gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhcnNpbmdGbGFncyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBleHRlbmQoe30sIHRoaXMuX3BmKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnZhbGlkQXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZi5vdmVyZmxvdztcbiAgICAgICAgfSxcblxuICAgICAgICB1dGMgOiBmdW5jdGlvbiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZSgwLCBrZWVwTG9jYWxUaW1lKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2NhbCA6IGZ1bmN0aW9uIChrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNVVEMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvbmUoMCwga2VlcExvY2FsVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faXNVVEMgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHRoaXMuX2RhdGVUek9mZnNldCgpLCAnbScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZvcm1hdCA6IGZ1bmN0aW9uIChpbnB1dFN0cmluZykge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IGZvcm1hdE1vbWVudCh0aGlzLCBpbnB1dFN0cmluZyB8fCBtb21lbnQuZGVmYXVsdEZvcm1hdCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkucG9zdGZvcm1hdChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZCA6IGNyZWF0ZUFkZGVyKDEsICdhZGQnKSxcblxuICAgICAgICBzdWJ0cmFjdCA6IGNyZWF0ZUFkZGVyKC0xLCAnc3VidHJhY3QnKSxcblxuICAgICAgICBkaWZmIDogZnVuY3Rpb24gKGlucHV0LCB1bml0cywgYXNGbG9hdCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSBtYWtlQXMoaW5wdXQsIHRoaXMpLFxuICAgICAgICAgICAgICAgIHpvbmVEaWZmID0gKHRoaXMuem9uZSgpIC0gdGhhdC56b25lKCkpICogNmU0LFxuICAgICAgICAgICAgICAgIGRpZmYsIG91dHB1dCwgZGF5c0FkanVzdDtcblxuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG5cbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInIHx8IHVuaXRzID09PSAnbW9udGgnKSB7XG4gICAgICAgICAgICAgICAgLy8gYXZlcmFnZSBudW1iZXIgb2YgZGF5cyBpbiB0aGUgbW9udGhzIGluIHRoZSBnaXZlbiBkYXRlc1xuICAgICAgICAgICAgICAgIGRpZmYgPSAodGhpcy5kYXlzSW5Nb250aCgpICsgdGhhdC5kYXlzSW5Nb250aCgpKSAqIDQzMmU1OyAvLyAyNCAqIDYwICogNjAgKiAxMDAwIC8gMlxuICAgICAgICAgICAgICAgIC8vIGRpZmZlcmVuY2UgaW4gbW9udGhzXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gKCh0aGlzLnllYXIoKSAtIHRoYXQueWVhcigpKSAqIDEyKSArICh0aGlzLm1vbnRoKCkgLSB0aGF0Lm1vbnRoKCkpO1xuICAgICAgICAgICAgICAgIC8vIGFkanVzdCBieSB0YWtpbmcgZGlmZmVyZW5jZSBpbiBkYXlzLCBhdmVyYWdlIG51bWJlciBvZiBkYXlzXG4gICAgICAgICAgICAgICAgLy8gYW5kIGRzdCBpbiB0aGUgZ2l2ZW4gbW9udGhzLlxuICAgICAgICAgICAgICAgIGRheXNBZGp1c3QgPSAodGhpcyAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCdtb250aCcpKSAtXG4gICAgICAgICAgICAgICAgICAgICh0aGF0IC0gbW9tZW50KHRoYXQpLnN0YXJ0T2YoJ21vbnRoJykpO1xuICAgICAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdpdGggem9uZXMsIHRvIG5lZ2F0ZSBhbGwgZHN0XG4gICAgICAgICAgICAgICAgZGF5c0FkanVzdCAtPSAoKHRoaXMuem9uZSgpIC0gbW9tZW50KHRoaXMpLnN0YXJ0T2YoJ21vbnRoJykuem9uZSgpKSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAodGhhdC56b25lKCkgLSBtb21lbnQodGhhdCkuc3RhcnRPZignbW9udGgnKS56b25lKCkpKSAqIDZlNDtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gZGF5c0FkanVzdCAvIGRpZmY7XG4gICAgICAgICAgICAgICAgaWYgKHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0IC8gMTI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gKHRoaXMgLSB0aGF0KTtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB1bml0cyA9PT0gJ3NlY29uZCcgPyBkaWZmIC8gMWUzIDogLy8gMTAwMFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ21pbnV0ZScgPyBkaWZmIC8gNmU0IDogLy8gMTAwMCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnaG91cicgPyBkaWZmIC8gMzZlNSA6IC8vIDEwMDAgKiA2MCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnZGF5JyA/IChkaWZmIC0gem9uZURpZmYpIC8gODY0ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnd2VlaycgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDYwNDhlNSA6IC8vIDEwMDAgKiA2MCAqIDYwICogMjQgKiA3LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIGRpZmY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXNGbG9hdCA/IG91dHB1dCA6IGFic1JvdW5kKG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZnJvbSA6IGZ1bmN0aW9uICh0aW1lLCB3aXRob3V0U3VmZml4KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmR1cmF0aW9uKHt0bzogdGhpcywgZnJvbTogdGltZX0pLmxvY2FsZSh0aGlzLmxvY2FsZSgpKS5odW1hbml6ZSghd2l0aG91dFN1ZmZpeCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZnJvbU5vdyA6IGZ1bmN0aW9uICh3aXRob3V0U3VmZml4KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mcm9tKG1vbWVudCgpLCB3aXRob3V0U3VmZml4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxlbmRhciA6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgICAgICAgICAvLyBXZSB3YW50IHRvIGNvbXBhcmUgdGhlIHN0YXJ0IG9mIHRvZGF5LCB2cyB0aGlzLlxuICAgICAgICAgICAgLy8gR2V0dGluZyBzdGFydC1vZi10b2RheSBkZXBlbmRzIG9uIHdoZXRoZXIgd2UncmUgem9uZSdkIG9yIG5vdC5cbiAgICAgICAgICAgIHZhciBub3cgPSB0aW1lIHx8IG1vbWVudCgpLFxuICAgICAgICAgICAgICAgIHNvZCA9IG1ha2VBcyhub3csIHRoaXMpLnN0YXJ0T2YoJ2RheScpLFxuICAgICAgICAgICAgICAgIGRpZmYgPSB0aGlzLmRpZmYoc29kLCAnZGF5cycsIHRydWUpLFxuICAgICAgICAgICAgICAgIGZvcm1hdCA9IGRpZmYgPCAtNiA/ICdzYW1lRWxzZScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgLTEgPyAnbGFzdFdlZWsnIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDAgPyAnbGFzdERheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMSA/ICdzYW1lRGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAyID8gJ25leHREYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDcgPyAnbmV4dFdlZWsnIDogJ3NhbWVFbHNlJztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdCh0aGlzLmxvY2FsZURhdGEoKS5jYWxlbmRhcihmb3JtYXQsIHRoaXMsIG1vbWVudChub3cpKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNMZWFwWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0xlYXBZZWFyKHRoaXMueWVhcigpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0RTVCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAodGhpcy56b25lKCkgPCB0aGlzLmNsb25lKCkubW9udGgoMCkuem9uZSgpIHx8XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKCkgPCB0aGlzLmNsb25lKCkubW9udGgoNSkuem9uZSgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciBkYXkgPSB0aGlzLl9pc1VUQyA/IHRoaXMuX2QuZ2V0VVRDRGF5KCkgOiB0aGlzLl9kLmdldERheSgpO1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlV2Vla2RheShpbnB1dCwgdGhpcy5sb2NhbGVEYXRhKCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChpbnB1dCAtIGRheSwgJ2QnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtb250aCA6IG1ha2VBY2Nlc3NvcignTW9udGgnLCB0cnVlKSxcblxuICAgICAgICBzdGFydE9mIDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgc3dpdGNoIGludGVudGlvbmFsbHkgb21pdHMgYnJlYWsga2V5d29yZHNcbiAgICAgICAgICAgIC8vIHRvIHV0aWxpemUgZmFsbGluZyB0aHJvdWdoIHRoZSBjYXNlcy5cbiAgICAgICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgICAgIGNhc2UgJ3llYXInOlxuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAncXVhcnRlcic6XG4gICAgICAgICAgICBjYXNlICdtb250aCc6XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRlKDEpO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnaXNvV2Vlayc6XG4gICAgICAgICAgICBjYXNlICdkYXknOlxuICAgICAgICAgICAgICAgIHRoaXMuaG91cnMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnaG91cic6XG4gICAgICAgICAgICAgICAgdGhpcy5taW51dGVzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgICAgICAgICAgICAgdGhpcy5taWxsaXNlY29uZHMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB3ZWVrcyBhcmUgYSBzcGVjaWFsIGNhc2VcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrZGF5KDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1bml0cyA9PT0gJ2lzb1dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc29XZWVrZGF5KDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBxdWFydGVycyBhcmUgYWxzbyBzcGVjaWFsXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoTWF0aC5mbG9vcih0aGlzLm1vbnRoKCkgLyAzKSAqIDMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBlbmRPZjogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gdW5kZWZpbmVkIHx8IHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydE9mKHVuaXRzKS5hZGQoMSwgKHVuaXRzID09PSAnaXNvV2VlaycgPyAnd2VlaycgOiB1bml0cykpLnN1YnRyYWN0KDEsICdtcycpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzQWZ0ZXI6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMpIHtcbiAgICAgICAgICAgIHZhciBpbnB1dE1zO1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh0eXBlb2YgdW5pdHMgIT09ICd1bmRlZmluZWQnID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnKTtcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/IGlucHV0IDogbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gK3RoaXMgPiAraW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0TXMgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gK2lucHV0IDogK21vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0TXMgPCArdGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzQmVmb3JlOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzIDwgK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/ICtpbnB1dCA6ICttb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcy5jbG9uZSgpLmVuZE9mKHVuaXRzKSA8IGlucHV0TXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNTYW1lOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMgfHwgJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzID09PSAraW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0TXMgPSArbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKyh0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykpIDw9IGlucHV0TXMgJiYgaW5wdXRNcyA8PSArKHRoaXMuY2xvbmUoKS5lbmRPZih1bml0cykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG1pbjogZGVwcmVjYXRlKFxuICAgICAgICAgICAgICAgICAnbW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWluIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4JyxcbiAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICBvdGhlciA9IG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyIDwgdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgKSxcblxuICAgICAgICBtYXg6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAnbW9tZW50KCkubWF4IGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4JyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3RoZXIgPSBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyID4gdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgLy8ga2VlcExvY2FsVGltZSA9IHRydWUgbWVhbnMgb25seSBjaGFuZ2UgdGhlIHRpbWV6b25lLCB3aXRob3V0XG4gICAgICAgIC8vIGFmZmVjdGluZyB0aGUgbG9jYWwgaG91ci4gU28gNTozMToyNiArMDMwMCAtLVt6b25lKDIsIHRydWUpXS0tPlxuICAgICAgICAvLyA1OjMxOjI2ICswMjAwIEl0IGlzIHBvc3NpYmxlIHRoYXQgNTozMToyNiBkb2Vzbid0IGV4aXN0IGludCB6b25lXG4gICAgICAgIC8vICswMjAwLCBzbyB3ZSBhZGp1c3QgdGhlIHRpbWUgYXMgbmVlZGVkLCB0byBiZSB2YWxpZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gS2VlcGluZyB0aGUgdGltZSBhY3R1YWxseSBhZGRzL3N1YnRyYWN0cyAob25lIGhvdXIpXG4gICAgICAgIC8vIGZyb20gdGhlIGFjdHVhbCByZXByZXNlbnRlZCB0aW1lLiBUaGF0IGlzIHdoeSB3ZSBjYWxsIHVwZGF0ZU9mZnNldFxuICAgICAgICAvLyBhIHNlY29uZCB0aW1lLiBJbiBjYXNlIGl0IHdhbnRzIHVzIHRvIGNoYW5nZSB0aGUgb2Zmc2V0IGFnYWluXG4gICAgICAgIC8vIF9jaGFuZ2VJblByb2dyZXNzID09IHRydWUgY2FzZSwgdGhlbiB3ZSBoYXZlIHRvIGFkanVzdCwgYmVjYXVzZVxuICAgICAgICAvLyB0aGVyZSBpcyBubyBzdWNoIHRpbWUgaW4gdGhlIGdpdmVuIHRpbWV6b25lLlxuICAgICAgICB6b25lIDogZnVuY3Rpb24gKGlucHV0LCBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fb2Zmc2V0IHx8IDAsXG4gICAgICAgICAgICAgICAgbG9jYWxBZGp1c3Q7XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gdGltZXpvbmVNaW51dGVzRnJvbVN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhpbnB1dCkgPCAxNikge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IGlucHV0ICogNjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faXNVVEMgJiYga2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbEFkanVzdCA9IHRoaXMuX2RhdGVUek9mZnNldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9vZmZzZXQgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICB0aGlzLl9pc1VUQyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsQWRqdXN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJ0cmFjdChsb2NhbEFkanVzdCwgJ20nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9mZnNldCAhPT0gaW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFrZWVwTG9jYWxUaW1lIHx8IHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQodGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9tZW50LmR1cmF0aW9uKG9mZnNldCAtIGlucHV0LCAnbScpLCAxLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyBvZmZzZXQgOiB0aGlzLl9kYXRlVHpPZmZzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHpvbmVBYmJyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gJ1VUQycgOiAnJztcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lTmFtZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdDb29yZGluYXRlZCBVbml2ZXJzYWwgVGltZScgOiAnJztcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzZVpvbmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdHptKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKHRoaXMuX3R6bSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLl9pID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuem9uZSh0aGlzLl9pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhc0FsaWduZWRIb3VyT2Zmc2V0IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICBpZiAoIWlucHV0KSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQoaW5wdXQpLnpvbmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnpvbmUoKSAtIGlucHV0KSAlIDYwID09PSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheXNJbk1vbnRoIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRheXNJbk1vbnRoKHRoaXMueWVhcigpLCB0aGlzLm1vbnRoKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheU9mWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIGRheU9mWWVhciA9IHJvdW5kKChtb21lbnQodGhpcykuc3RhcnRPZignZGF5JykgLSBtb21lbnQodGhpcykuc3RhcnRPZigneWVhcicpKSAvIDg2NGU1KSArIDE7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IGRheU9mWWVhciA6IHRoaXMuYWRkKChpbnB1dCAtIGRheU9mWWVhciksICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcXVhcnRlciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyBNYXRoLmNlaWwoKHRoaXMubW9udGgoKSArIDEpIC8gMykgOiB0aGlzLm1vbnRoKChpbnB1dCAtIDEpICogMyArIHRoaXMubW9udGgoKSAlIDMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtZZWFyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgeWVhciA9IHdlZWtPZlllYXIodGhpcywgdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93LCB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3kpLnllYXI7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSB5ZWFyKSwgJ3knKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLnllYXI7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSB5ZWFyKSwgJ3knKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2VlayA9IHRoaXMubG9jYWxlRGF0YSgpLndlZWsodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2VlayA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWsgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLndlZWs7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla2RheSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWtkYXkgPSAodGhpcy5kYXkoKSArIDcgLSB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3cpICUgNztcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2Vla2RheSA6IHRoaXMuYWRkKGlucHV0IC0gd2Vla2RheSwgJ2QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBiZWhhdmVzIHRoZSBzYW1lIGFzIG1vbWVudCNkYXkgZXhjZXB0XG4gICAgICAgICAgICAvLyBhcyBhIGdldHRlciwgcmV0dXJucyA3IGluc3RlYWQgb2YgMCAoMS03IHJhbmdlIGluc3RlYWQgb2YgMC02KVxuICAgICAgICAgICAgLy8gYXMgYSBzZXR0ZXIsIHN1bmRheSBzaG91bGQgYmVsb25nIHRvIHRoZSBwcmV2aW91cyB3ZWVrLlxuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB0aGlzLmRheSgpIHx8IDcgOiB0aGlzLmRheSh0aGlzLmRheSgpICUgNyA/IGlucHV0IDogaW5wdXQgLSA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrc0luWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgMSwgNCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla3NJblllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgd2Vla0luZm8gPSB0aGlzLmxvY2FsZURhdGEoKS5fd2VlaztcbiAgICAgICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgd2Vla0luZm8uZG93LCB3ZWVrSW5mby5kb3kpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1t1bml0c10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXQgOiBmdW5jdGlvbiAodW5pdHMsIHZhbHVlKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1t1bml0c10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzW3VuaXRzXSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBJZiBwYXNzZWQgYSBsb2NhbGUga2V5LCBpdCB3aWxsIHNldCB0aGUgbG9jYWxlIGZvciB0aGlzXG4gICAgICAgIC8vIGluc3RhbmNlLiAgT3RoZXJ3aXNlLCBpdCB3aWxsIHJldHVybiB0aGUgbG9jYWxlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgLy8gdmFyaWFibGVzIGZvciB0aGlzIGluc3RhbmNlLlxuICAgICAgICBsb2NhbGUgOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgbmV3TG9jYWxlRGF0YTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZS5fYWJicjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3TG9jYWxlRGF0YSA9IG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKG5ld0xvY2FsZURhdGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhbGUgPSBuZXdMb2NhbGVEYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBsYW5nIDogZGVwcmVjYXRlKFxuICAgICAgICAgICAgJ21vbWVudCgpLmxhbmcoKSBpcyBkZXByZWNhdGVkLiBJbnN0ZWFkLCB1c2UgbW9tZW50KCkubG9jYWxlRGF0YSgpIHRvIGdldCB0aGUgbGFuZ3VhZ2UgY29uZmlndXJhdGlvbi4gVXNlIG1vbWVudCgpLmxvY2FsZSgpIHRvIGNoYW5nZSBsYW5ndWFnZXMuJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZShrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKSxcblxuICAgICAgICBsb2NhbGVEYXRhIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZGF0ZVR6T2Zmc2V0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gT24gRmlyZWZveC4yNCBEYXRlI2dldFRpbWV6b25lT2Zmc2V0IHJldHVybnMgYSBmbG9hdGluZyBwb2ludC5cbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L3B1bGwvMTg3MVxuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQodGhpcy5fZC5nZXRUaW1lem9uZU9mZnNldCgpIC8gMTUpICogMTU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGRheU9mTW9udGg7XG5cbiAgICAgICAgLy8gVE9ETzogTW92ZSB0aGlzIG91dCBvZiBoZXJlIVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWUgPSBtb20ubG9jYWxlRGF0YSgpLm1vbnRoc1BhcnNlKHZhbHVlKTtcbiAgICAgICAgICAgIC8vIFRPRE86IEFub3RoZXIgc2lsZW50IGZhaWx1cmU/XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb207XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkYXlPZk1vbnRoID0gTWF0aC5taW4obW9tLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBkYXlzSW5Nb250aChtb20ueWVhcigpLCB2YWx1ZSkpO1xuICAgICAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgJ01vbnRoJ10odmFsdWUsIGRheU9mTW9udGgpO1xuICAgICAgICByZXR1cm4gbW9tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd0dldHRlcihtb20sIHVuaXQpIHtcbiAgICAgICAgcmV0dXJuIG1vbS5fZFsnZ2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd1NldHRlcihtb20sIHVuaXQsIHZhbHVlKSB7XG4gICAgICAgIGlmICh1bml0ID09PSAnTW9udGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmF3TW9udGhTZXR0ZXIobW9tLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VBY2Nlc3Nvcih1bml0LCBrZWVwVGltZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJhd1NldHRlcih0aGlzLCB1bml0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzLCBrZWVwVGltZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiByYXdHZXR0ZXIodGhpcywgdW5pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgbW9tZW50LmZuLm1pbGxpc2Vjb25kID0gbW9tZW50LmZuLm1pbGxpc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignTWlsbGlzZWNvbmRzJywgZmFsc2UpO1xuICAgIG1vbWVudC5mbi5zZWNvbmQgPSBtb21lbnQuZm4uc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignU2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4ubWludXRlID0gbW9tZW50LmZuLm1pbnV0ZXMgPSBtYWtlQWNjZXNzb3IoJ01pbnV0ZXMnLCBmYWxzZSk7XG4gICAgLy8gU2V0dGluZyB0aGUgaG91ciBzaG91bGQga2VlcCB0aGUgdGltZSwgYmVjYXVzZSB0aGUgdXNlciBleHBsaWNpdGx5XG4gICAgLy8gc3BlY2lmaWVkIHdoaWNoIGhvdXIgaGUgd2FudHMuIFNvIHRyeWluZyB0byBtYWludGFpbiB0aGUgc2FtZSBob3VyIChpblxuICAgIC8vIGEgbmV3IHRpbWV6b25lKSBtYWtlcyBzZW5zZS4gQWRkaW5nL3N1YnRyYWN0aW5nIGhvdXJzIGRvZXMgbm90IGZvbGxvd1xuICAgIC8vIHRoaXMgcnVsZS5cbiAgICBtb21lbnQuZm4uaG91ciA9IG1vbWVudC5mbi5ob3VycyA9IG1ha2VBY2Nlc3NvcignSG91cnMnLCB0cnVlKTtcbiAgICAvLyBtb21lbnQuZm4ubW9udGggaXMgZGVmaW5lZCBzZXBhcmF0ZWx5XG4gICAgbW9tZW50LmZuLmRhdGUgPSBtYWtlQWNjZXNzb3IoJ0RhdGUnLCB0cnVlKTtcbiAgICBtb21lbnQuZm4uZGF0ZXMgPSBkZXByZWNhdGUoJ2RhdGVzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSBkYXRlIGluc3RlYWQuJywgbWFrZUFjY2Vzc29yKCdEYXRlJywgdHJ1ZSkpO1xuICAgIG1vbWVudC5mbi55ZWFyID0gbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpO1xuICAgIG1vbWVudC5mbi55ZWFycyA9IGRlcHJlY2F0ZSgneWVhcnMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIHllYXIgaW5zdGVhZC4nLCBtYWtlQWNjZXNzb3IoJ0Z1bGxZZWFyJywgdHJ1ZSkpO1xuXG4gICAgLy8gYWRkIHBsdXJhbCBtZXRob2RzXG4gICAgbW9tZW50LmZuLmRheXMgPSBtb21lbnQuZm4uZGF5O1xuICAgIG1vbWVudC5mbi5tb250aHMgPSBtb21lbnQuZm4ubW9udGg7XG4gICAgbW9tZW50LmZuLndlZWtzID0gbW9tZW50LmZuLndlZWs7XG4gICAgbW9tZW50LmZuLmlzb1dlZWtzID0gbW9tZW50LmZuLmlzb1dlZWs7XG4gICAgbW9tZW50LmZuLnF1YXJ0ZXJzID0gbW9tZW50LmZuLnF1YXJ0ZXI7XG5cbiAgICAvLyBhZGQgYWxpYXNlZCBmb3JtYXQgbWV0aG9kc1xuICAgIG1vbWVudC5mbi50b0pTT04gPSBtb21lbnQuZm4udG9JU09TdHJpbmc7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIER1cmF0aW9uIFByb3RvdHlwZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZnVuY3Rpb24gZGF5c1RvWWVhcnMgKGRheXMpIHtcbiAgICAgICAgLy8gNDAwIHllYXJzIGhhdmUgMTQ2MDk3IGRheXMgKHRha2luZyBpbnRvIGFjY291bnQgbGVhcCB5ZWFyIHJ1bGVzKVxuICAgICAgICByZXR1cm4gZGF5cyAqIDQwMCAvIDE0NjA5NztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB5ZWFyc1RvRGF5cyAoeWVhcnMpIHtcbiAgICAgICAgLy8geWVhcnMgKiAzNjUgKyBhYnNSb3VuZCh5ZWFycyAvIDQpIC1cbiAgICAgICAgLy8gICAgIGFic1JvdW5kKHllYXJzIC8gMTAwKSArIGFic1JvdW5kKHllYXJzIC8gNDAwKTtcbiAgICAgICAgcmV0dXJuIHllYXJzICogMTQ2MDk3IC8gNDAwO1xuICAgIH1cblxuICAgIGV4dGVuZChtb21lbnQuZHVyYXRpb24uZm4gPSBEdXJhdGlvbi5wcm90b3R5cGUsIHtcblxuICAgICAgICBfYnViYmxlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyxcbiAgICAgICAgICAgICAgICBtb250aHMgPSB0aGlzLl9tb250aHMsXG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuX2RhdGEsXG4gICAgICAgICAgICAgICAgc2Vjb25kcywgbWludXRlcywgaG91cnMsIHllYXJzID0gMDtcblxuICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBjb2RlIGJ1YmJsZXMgdXAgdmFsdWVzLCBzZWUgdGhlIHRlc3RzIGZvclxuICAgICAgICAgICAgLy8gZXhhbXBsZXMgb2Ygd2hhdCB0aGF0IG1lYW5zLlxuICAgICAgICAgICAgZGF0YS5taWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZHMgJSAxMDAwO1xuXG4gICAgICAgICAgICBzZWNvbmRzID0gYWJzUm91bmQobWlsbGlzZWNvbmRzIC8gMTAwMCk7XG4gICAgICAgICAgICBkYXRhLnNlY29uZHMgPSBzZWNvbmRzICUgNjA7XG5cbiAgICAgICAgICAgIG1pbnV0ZXMgPSBhYnNSb3VuZChzZWNvbmRzIC8gNjApO1xuICAgICAgICAgICAgZGF0YS5taW51dGVzID0gbWludXRlcyAlIDYwO1xuXG4gICAgICAgICAgICBob3VycyA9IGFic1JvdW5kKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgICAgICBkYXRhLmhvdXJzID0gaG91cnMgJSAyNDtcblxuICAgICAgICAgICAgZGF5cyArPSBhYnNSb3VuZChob3VycyAvIDI0KTtcblxuICAgICAgICAgICAgLy8gQWNjdXJhdGVseSBjb252ZXJ0IGRheXMgdG8geWVhcnMsIGFzc3VtZSBzdGFydCBmcm9tIHllYXIgMC5cbiAgICAgICAgICAgIHllYXJzID0gYWJzUm91bmQoZGF5c1RvWWVhcnMoZGF5cykpO1xuICAgICAgICAgICAgZGF5cyAtPSBhYnNSb3VuZCh5ZWFyc1RvRGF5cyh5ZWFycykpO1xuXG4gICAgICAgICAgICAvLyAzMCBkYXlzIHRvIGEgbW9udGhcbiAgICAgICAgICAgIC8vIFRPRE8gKGlza3Jlbik6IFVzZSBhbmNob3IgZGF0ZSAobGlrZSAxc3QgSmFuKSB0byBjb21wdXRlIHRoaXMuXG4gICAgICAgICAgICBtb250aHMgKz0gYWJzUm91bmQoZGF5cyAvIDMwKTtcbiAgICAgICAgICAgIGRheXMgJT0gMzA7XG5cbiAgICAgICAgICAgIC8vIDEyIG1vbnRocyAtPiAxIHllYXJcbiAgICAgICAgICAgIHllYXJzICs9IGFic1JvdW5kKG1vbnRocyAvIDEyKTtcbiAgICAgICAgICAgIG1vbnRocyAlPSAxMjtcblxuICAgICAgICAgICAgZGF0YS5kYXlzID0gZGF5cztcbiAgICAgICAgICAgIGRhdGEubW9udGhzID0gbW9udGhzO1xuICAgICAgICAgICAgZGF0YS55ZWFycyA9IHllYXJzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFicyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX21pbGxpc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXlzID0gTWF0aC5hYnModGhpcy5fZGF5cyk7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgPSBNYXRoLmFicyh0aGlzLl9tb250aHMpO1xuXG4gICAgICAgICAgICB0aGlzLl9kYXRhLm1pbGxpc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX2RhdGEubWlsbGlzZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEuc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX2RhdGEuc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLm1pbnV0ZXMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1pbnV0ZXMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5ob3VycyA9IE1hdGguYWJzKHRoaXMuX2RhdGEuaG91cnMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5tb250aHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1vbnRocyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLnllYXJzID0gTWF0aC5hYnModGhpcy5fZGF0YS55ZWFycyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFic1JvdW5kKHRoaXMuZGF5cygpIC8gNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdmFsdWVPZiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9taWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgICB0aGlzLl9kYXlzICogODY0ZTUgK1xuICAgICAgICAgICAgICAodGhpcy5fbW9udGhzICUgMTIpICogMjU5MmU2ICtcbiAgICAgICAgICAgICAgdG9JbnQodGhpcy5fbW9udGhzIC8gMTIpICogMzE1MzZlNjtcbiAgICAgICAgfSxcblxuICAgICAgICBodW1hbml6ZSA6IGZ1bmN0aW9uICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gcmVsYXRpdmVUaW1lKHRoaXMsICF3aXRoU3VmZml4LCB0aGlzLmxvY2FsZURhdGEoKSk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdGhpcy5sb2NhbGVEYXRhKCkucGFzdEZ1dHVyZSgrdGhpcywgb3V0cHV0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgLy8gc3VwcG9ydHMgb25seSAyLjAtc3R5bGUgYWRkKDEsICdzJykgb3IgYWRkKG1vbWVudClcbiAgICAgICAgICAgIHZhciBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyArPSBkdXIuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHRoaXMuX2RheXMgKz0gZHVyLl9kYXlzO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzICs9IGR1ci5fbW9udGhzO1xuXG4gICAgICAgICAgICB0aGlzLl9idWJibGUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3VidHJhY3QgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgdmFyIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcblxuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzIC09IGR1ci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyAtPSBkdXIuX2RheXM7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgLT0gZHVyLl9tb250aHM7XG5cbiAgICAgICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHMudG9Mb3dlckNhc2UoKSArICdzJ10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhcyA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGRheXMsIG1vbnRocztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtb250aCcgfHwgdW5pdHMgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICAgICAgbW9udGhzID0gdGhpcy5fbW9udGhzICsgZGF5c1RvWWVhcnMoZGF5cykgKiAxMjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5pdHMgPT09ICdtb250aCcgPyBtb250aHMgOiBtb250aHMgLyAxMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlIG1pbGxpc2Vjb25kcyBzZXBhcmF0ZWx5IGJlY2F1c2Ugb2YgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgKGlzc3VlICMxODY3KVxuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzICsgTWF0aC5yb3VuZCh5ZWFyc1RvRGF5cyh0aGlzLl9tb250aHMgLyAxMikpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnd2Vlayc6IHJldHVybiBkYXlzIC8gNyArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDYwNDhlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF5JzogcmV0dXJuIGRheXMgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA4NjRlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaG91cic6IHJldHVybiBkYXlzICogMjQgKyB0aGlzLl9taWxsaXNlY29uZHMgLyAzNmU1O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtaW51dGUnOiByZXR1cm4gZGF5cyAqIDI0ICogNjAgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA2ZTQ7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlY29uZCc6IHJldHVybiBkYXlzICogMjQgKiA2MCAqIDYwICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gMTAwMDtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWF0aC5mbG9vciBwcmV2ZW50cyBmbG9hdGluZyBwb2ludCBtYXRoIGVycm9ycyBoZXJlXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21pbGxpc2Vjb25kJzogcmV0dXJuIE1hdGguZmxvb3IoZGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDApICsgdGhpcy5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gdW5pdCAnICsgdW5pdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBsYW5nIDogbW9tZW50LmZuLmxhbmcsXG4gICAgICAgIGxvY2FsZSA6IG1vbWVudC5mbi5sb2NhbGUsXG5cbiAgICAgICAgdG9Jc29TdHJpbmcgOiBkZXByZWNhdGUoXG4gICAgICAgICAgICAndG9Jc29TdHJpbmcoKSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIHRvSVNPU3RyaW5nKCkgaW5zdGVhZCAnICtcbiAgICAgICAgICAgICcobm90aWNlIHRoZSBjYXBpdGFscyknLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBpbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vZG9yZGlsbGUvbW9tZW50LWlzb2R1cmF0aW9uL2Jsb2IvbWFzdGVyL21vbWVudC5pc29kdXJhdGlvbi5qc1xuICAgICAgICAgICAgdmFyIHllYXJzID0gTWF0aC5hYnModGhpcy55ZWFycygpKSxcbiAgICAgICAgICAgICAgICBtb250aHMgPSBNYXRoLmFicyh0aGlzLm1vbnRocygpKSxcbiAgICAgICAgICAgICAgICBkYXlzID0gTWF0aC5hYnModGhpcy5kYXlzKCkpLFxuICAgICAgICAgICAgICAgIGhvdXJzID0gTWF0aC5hYnModGhpcy5ob3VycygpKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gTWF0aC5hYnModGhpcy5taW51dGVzKCkpLFxuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBNYXRoLmFicyh0aGlzLnNlY29uZHMoKSArIHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmFzU2Vjb25kcygpKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgc2FtZSBhcyBDIydzIChOb2RhKSBhbmQgcHl0aG9uIChpc29kYXRlKS4uLlxuICAgICAgICAgICAgICAgIC8vIGJ1dCBub3Qgb3RoZXIgSlMgKGdvb2cuZGF0ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1AwRCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy5hc1NlY29uZHMoKSA8IDAgPyAnLScgOiAnJykgK1xuICAgICAgICAgICAgICAgICdQJyArXG4gICAgICAgICAgICAgICAgKHllYXJzID8geWVhcnMgKyAnWScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChtb250aHMgPyBtb250aHMgKyAnTScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChkYXlzID8gZGF5cyArICdEJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKChob3VycyB8fCBtaW51dGVzIHx8IHNlY29uZHMpID8gJ1QnIDogJycpICtcbiAgICAgICAgICAgICAgICAoaG91cnMgPyBob3VycyArICdIJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKG1pbnV0ZXMgPyBtaW51dGVzICsgJ00nIDogJycpICtcbiAgICAgICAgICAgICAgICAoc2Vjb25kcyA/IHNlY29uZHMgKyAnUycgOiAnJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9jYWxlRGF0YSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIG1vbWVudC5kdXJhdGlvbi5mbi50b1N0cmluZyA9IG1vbWVudC5kdXJhdGlvbi5mbi50b0lTT1N0cmluZztcblxuICAgIGZ1bmN0aW9uIG1ha2VEdXJhdGlvbkdldHRlcihuYW1lKSB7XG4gICAgICAgIG1vbWVudC5kdXJhdGlvbi5mbltuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kYXRhW25hbWVdO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZvciAoaSBpbiB1bml0TWlsbGlzZWNvbmRGYWN0b3JzKSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wKHVuaXRNaWxsaXNlY29uZEZhY3RvcnMsIGkpKSB7XG4gICAgICAgICAgICBtYWtlRHVyYXRpb25HZXR0ZXIoaS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01pbGxpc2Vjb25kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ21zJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNTZWNvbmRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygncycpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzTWludXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ20nKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc0hvdXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnaCcpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzRGF5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ2QnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc1dlZWtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnd2Vla3MnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01vbnRocyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ00nKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc1llYXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygneScpO1xuICAgIH07XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIERlZmF1bHQgTG9jYWxlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBTZXQgZGVmYXVsdCBsb2NhbGUsIG90aGVyIGxvY2FsZSB3aWxsIGluaGVyaXQgZnJvbSBFbmdsaXNoLlxuICAgIG1vbWVudC5sb2NhbGUoJ2VuJywge1xuICAgICAgICBvcmRpbmFsUGFyc2U6IC9cXGR7MSwyfSh0aHxzdHxuZHxyZCkvLFxuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgdmFyIGIgPSBudW1iZXIgJSAxMCxcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSAodG9JbnQobnVtYmVyICUgMTAwIC8gMTApID09PSAxKSA/ICd0aCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAxKSA/ICdzdCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAyKSA/ICduZCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAzKSA/ICdyZCcgOiAndGgnO1xuICAgICAgICAgICAgcmV0dXJuIG51bWJlciArIG91dHB1dDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyogRU1CRURfTE9DQUxFUyAqL1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBFeHBvc2luZyBNb21lbnRcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBtYWtlR2xvYmFsKHNob3VsZERlcHJlY2F0ZSkge1xuICAgICAgICAvKmdsb2JhbCBlbmRlcjpmYWxzZSAqL1xuICAgICAgICBpZiAodHlwZW9mIGVuZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9sZEdsb2JhbE1vbWVudCA9IGdsb2JhbFNjb3BlLm1vbWVudDtcbiAgICAgICAgaWYgKHNob3VsZERlcHJlY2F0ZSkge1xuICAgICAgICAgICAgZ2xvYmFsU2NvcGUubW9tZW50ID0gZGVwcmVjYXRlKFxuICAgICAgICAgICAgICAgICAgICAnQWNjZXNzaW5nIE1vbWVudCB0aHJvdWdoIHRoZSBnbG9iYWwgc2NvcGUgaXMgJyArXG4gICAgICAgICAgICAgICAgICAgICdkZXByZWNhdGVkLCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGFuIHVwY29taW5nICcgK1xuICAgICAgICAgICAgICAgICAgICAncmVsZWFzZS4nLFxuICAgICAgICAgICAgICAgICAgICBtb21lbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2xvYmFsU2NvcGUubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29tbW9uSlMgbW9kdWxlIGlzIGRlZmluZWRcbiAgICBpZiAoaGFzTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gbW9tZW50O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZSgnbW9tZW50JywgZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAgICAgICAgICAgaWYgKG1vZHVsZS5jb25maWcgJiYgbW9kdWxlLmNvbmZpZygpICYmIG1vZHVsZS5jb25maWcoKS5ub0dsb2JhbCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgdGhlIGdsb2JhbCB2YXJpYWJsZVxuICAgICAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG9sZEdsb2JhbE1vbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG1vbWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1ha2VHbG9iYWwodHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWFrZUdsb2JhbCgpO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoQnVmZmVyKXtcbnZhciBpb3RhID0gcmVxdWlyZShcImlvdGEtYXJyYXlcIilcblxudmFyIGhhc1R5cGVkQXJyYXlzICA9ICgodHlwZW9mIEZsb2F0NjRBcnJheSkgIT09IFwidW5kZWZpbmVkXCIpXG52YXIgaGFzQnVmZmVyICAgICAgID0gKCh0eXBlb2YgQnVmZmVyKSAhPT0gXCJ1bmRlZmluZWRcIilcblxuZnVuY3Rpb24gY29tcGFyZTFzdChhLCBiKSB7XG4gIHJldHVybiBhWzBdIC0gYlswXVxufVxuXG5mdW5jdGlvbiBvcmRlcigpIHtcbiAgdmFyIHN0cmlkZSA9IHRoaXMuc3RyaWRlXG4gIHZhciB0ZXJtcyA9IG5ldyBBcnJheShzdHJpZGUubGVuZ3RoKVxuICB2YXIgaVxuICBmb3IoaT0wOyBpPHRlcm1zLmxlbmd0aDsgKytpKSB7XG4gICAgdGVybXNbaV0gPSBbTWF0aC5hYnMoc3RyaWRlW2ldKSwgaV1cbiAgfVxuICB0ZXJtcy5zb3J0KGNvbXBhcmUxc3QpXG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkodGVybXMubGVuZ3RoKVxuICBmb3IoaT0wOyBpPHJlc3VsdC5sZW5ndGg7ICsraSkge1xuICAgIHJlc3VsdFtpXSA9IHRlcm1zW2ldWzFdXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiBjb21waWxlQ29uc3RydWN0b3IoZHR5cGUsIGRpbWVuc2lvbikge1xuICB2YXIgY2xhc3NOYW1lID0gW1wiVmlld1wiLCBkaW1lbnNpb24sIFwiZFwiLCBkdHlwZV0uam9pbihcIlwiKVxuICBpZihkaW1lbnNpb24gPCAwKSB7XG4gICAgY2xhc3NOYW1lID0gXCJWaWV3X05pbFwiICsgZHR5cGVcbiAgfVxuICB2YXIgdXNlR2V0dGVycyA9IChkdHlwZSA9PT0gXCJnZW5lcmljXCIpXG4gIFxuICBpZihkaW1lbnNpb24gPT09IC0xKSB7XG4gICAgLy9TcGVjaWFsIGNhc2UgZm9yIHRyaXZpYWwgYXJyYXlzXG4gICAgdmFyIGNvZGUgPSBcbiAgICAgIFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiKGEpe3RoaXMuZGF0YT1hO307XFxcbnZhciBwcm90bz1cIitjbGFzc05hbWUrXCIucHJvdG90eXBlO1xcXG5wcm90by5kdHlwZT0nXCIrZHR5cGUrXCInO1xcXG5wcm90by5pbmRleD1mdW5jdGlvbigpe3JldHVybiAtMX07XFxcbnByb3RvLnNpemU9MDtcXFxucHJvdG8uZGltZW5zaW9uPS0xO1xcXG5wcm90by5zaGFwZT1wcm90by5zdHJpZGU9cHJvdG8ub3JkZXI9W107XFxcbnByb3RvLmxvPXByb3RvLmhpPXByb3RvLnRyYW5zcG9zZT1wcm90by5zdGVwPVxcXG5mdW5jdGlvbigpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSk7fTtcXFxucHJvdG8uZ2V0PXByb3RvLnNldD1mdW5jdGlvbigpe307XFxcbnByb3RvLnBpY2s9ZnVuY3Rpb24oKXtyZXR1cm4gbnVsbH07XFxcbnJldHVybiBmdW5jdGlvbiBjb25zdHJ1Y3RfXCIrY2xhc3NOYW1lK1wiKGEpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGEpO31cIlxuICAgIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oY29kZSlcbiAgICByZXR1cm4gcHJvY2VkdXJlKClcbiAgfSBlbHNlIGlmKGRpbWVuc2lvbiA9PT0gMCkge1xuICAgIC8vU3BlY2lhbCBjYXNlIGZvciAwZCBhcnJheXNcbiAgICB2YXIgY29kZSA9XG4gICAgICBcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIihhLGQpIHtcXFxudGhpcy5kYXRhID0gYTtcXFxudGhpcy5vZmZzZXQgPSBkXFxcbn07XFxcbnZhciBwcm90bz1cIitjbGFzc05hbWUrXCIucHJvdG90eXBlO1xcXG5wcm90by5kdHlwZT0nXCIrZHR5cGUrXCInO1xcXG5wcm90by5pbmRleD1mdW5jdGlvbigpe3JldHVybiB0aGlzLm9mZnNldH07XFxcbnByb3RvLmRpbWVuc2lvbj0wO1xcXG5wcm90by5zaXplPTE7XFxcbnByb3RvLnNoYXBlPVxcXG5wcm90by5zdHJpZGU9XFxcbnByb3RvLm9yZGVyPVtdO1xcXG5wcm90by5sbz1cXFxucHJvdG8uaGk9XFxcbnByb3RvLnRyYW5zcG9zZT1cXFxucHJvdG8uc3RlcD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfY29weSgpIHtcXFxucmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLHRoaXMub2Zmc2V0KVxcXG59O1xcXG5wcm90by5waWNrPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9waWNrKCl7XFxcbnJldHVybiBUcml2aWFsQXJyYXkodGhpcy5kYXRhKTtcXFxufTtcXFxucHJvdG8udmFsdWVPZj1wcm90by5nZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2dldCgpe1xcXG5yZXR1cm4gXCIrKHVzZUdldHRlcnMgPyBcInRoaXMuZGF0YS5nZXQodGhpcy5vZmZzZXQpXCIgOiBcInRoaXMuZGF0YVt0aGlzLm9mZnNldF1cIikrXG5cIn07XFxcbnByb3RvLnNldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfc2V0KHYpe1xcXG5yZXR1cm4gXCIrKHVzZUdldHRlcnMgPyBcInRoaXMuZGF0YS5zZXQodGhpcy5vZmZzZXQsdilcIiA6IFwidGhpcy5kYXRhW3RoaXMub2Zmc2V0XT12XCIpK1wiXFxcbn07XFxcbnJldHVybiBmdW5jdGlvbiBjb25zdHJ1Y3RfXCIrY2xhc3NOYW1lK1wiKGEsYixjLGQpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGEsZCl9XCJcbiAgICB2YXIgcHJvY2VkdXJlID0gbmV3IEZ1bmN0aW9uKFwiVHJpdmlhbEFycmF5XCIsIGNvZGUpXG4gICAgcmV0dXJuIHByb2NlZHVyZShDQUNIRURfQ09OU1RSVUNUT1JTW2R0eXBlXVswXSlcbiAgfVxuXG4gIHZhciBjb2RlID0gW1wiJ3VzZSBzdHJpY3QnXCJdXG4gICAgXG4gIC8vQ3JlYXRlIGNvbnN0cnVjdG9yIGZvciB2aWV3XG4gIHZhciBpbmRpY2VzID0gaW90YShkaW1lbnNpb24pXG4gIHZhciBhcmdzID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJpXCIraSB9KVxuICB2YXIgaW5kZXhfc3RyID0gXCJ0aGlzLm9mZnNldCtcIiArIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgcmV0dXJuIFwidGhpcy5zdHJpZGVbXCIgKyBpICsgXCJdKmlcIiArIGlcbiAgICAgIH0pLmpvaW4oXCIrXCIpXG4gIHZhciBzaGFwZUFyZyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImJcIitpXG4gICAgfSkuam9pbihcIixcIilcbiAgdmFyIHN0cmlkZUFyZyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImNcIitpXG4gICAgfSkuam9pbihcIixcIilcbiAgY29kZS5wdXNoKFxuICAgIFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiKGEsXCIgKyBzaGFwZUFyZyArIFwiLFwiICsgc3RyaWRlQXJnICsgXCIsZCl7dGhpcy5kYXRhPWFcIixcbiAgICAgIFwidGhpcy5zaGFwZT1bXCIgKyBzaGFwZUFyZyArIFwiXVwiLFxuICAgICAgXCJ0aGlzLnN0cmlkZT1bXCIgKyBzdHJpZGVBcmcgKyBcIl1cIixcbiAgICAgIFwidGhpcy5vZmZzZXQ9ZHwwfVwiLFxuICAgIFwidmFyIHByb3RvPVwiK2NsYXNzTmFtZStcIi5wcm90b3R5cGVcIixcbiAgICBcInByb3RvLmR0eXBlPSdcIitkdHlwZStcIidcIixcbiAgICBcInByb3RvLmRpbWVuc2lvbj1cIitkaW1lbnNpb24pXG4gIFxuICAvL3ZpZXcuc2l6ZTpcbiAgY29kZS5wdXNoKFwiT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCdzaXplJyx7Z2V0OmZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zaXplKCl7XFxcbnJldHVybiBcIitpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcInRoaXMuc2hhcGVbXCIraStcIl1cIiB9KS5qb2luKFwiKlwiKSxcblwifX0pXCIpXG5cbiAgLy92aWV3Lm9yZGVyOlxuICBpZihkaW1lbnNpb24gPT09IDEpIHtcbiAgICBjb2RlLnB1c2goXCJwcm90by5vcmRlcj1bMF1cIilcbiAgfSBlbHNlIHtcbiAgICBjb2RlLnB1c2goXCJPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sJ29yZGVyJyx7Z2V0OlwiKVxuICAgIGlmKGRpbWVuc2lvbiA8IDQpIHtcbiAgICAgIGNvZGUucHVzaChcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9vcmRlcigpe1wiKVxuICAgICAgaWYoZGltZW5zaW9uID09PSAyKSB7XG4gICAgICAgIGNvZGUucHVzaChcInJldHVybiAoTWF0aC5hYnModGhpcy5zdHJpZGVbMF0pPk1hdGguYWJzKHRoaXMuc3RyaWRlWzFdKSk/WzEsMF06WzAsMV19fSlcIilcbiAgICAgIH0gZWxzZSBpZihkaW1lbnNpb24gPT09IDMpIHtcbiAgICAgICAgY29kZS5wdXNoKFxuXCJ2YXIgczA9TWF0aC5hYnModGhpcy5zdHJpZGVbMF0pLHMxPU1hdGguYWJzKHRoaXMuc3RyaWRlWzFdKSxzMj1NYXRoLmFicyh0aGlzLnN0cmlkZVsyXSk7XFxcbmlmKHMwPnMxKXtcXFxuaWYoczE+czIpe1xcXG5yZXR1cm4gWzIsMSwwXTtcXFxufWVsc2UgaWYoczA+czIpe1xcXG5yZXR1cm4gWzEsMiwwXTtcXFxufWVsc2V7XFxcbnJldHVybiBbMSwwLDJdO1xcXG59XFxcbn1lbHNlIGlmKHMwPnMyKXtcXFxucmV0dXJuIFsyLDAsMV07XFxcbn1lbHNlIGlmKHMyPnMxKXtcXFxucmV0dXJuIFswLDEsMl07XFxcbn1lbHNle1xcXG5yZXR1cm4gWzAsMiwxXTtcXFxufX19KVwiKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb2RlLnB1c2goXCJPUkRFUn0pXCIpXG4gICAgfVxuICB9XG4gIFxuICAvL3ZpZXcuc2V0KGkwLCAuLi4sIHYpOlxuICBjb2RlLnB1c2goXG5cInByb3RvLnNldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfc2V0KFwiK2FyZ3Muam9pbihcIixcIikrXCIsdil7XCIpXG4gIGlmKHVzZUdldHRlcnMpIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhLnNldChcIitpbmRleF9zdHIrXCIsdil9XCIpXG4gIH0gZWxzZSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIHRoaXMuZGF0YVtcIitpbmRleF9zdHIrXCJdPXZ9XCIpXG4gIH1cbiAgXG4gIC8vdmlldy5nZXQoaTAsIC4uLik6XG4gIGNvZGUucHVzaChcInByb3RvLmdldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfZ2V0KFwiK2FyZ3Muam9pbihcIixcIikrXCIpe1wiKVxuICBpZih1c2VHZXR0ZXJzKSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIHRoaXMuZGF0YS5nZXQoXCIraW5kZXhfc3RyK1wiKX1cIilcbiAgfSBlbHNlIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhW1wiK2luZGV4X3N0citcIl19XCIpXG4gIH1cbiAgXG4gIC8vdmlldy5pbmRleDpcbiAgY29kZS5wdXNoKFxuICAgIFwicHJvdG8uaW5kZXg9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2luZGV4KFwiLCBhcmdzLmpvaW4oKSwgXCIpe3JldHVybiBcIitpbmRleF9zdHIrXCJ9XCIpXG5cbiAgLy92aWV3LmhpKCk6XG4gIGNvZGUucHVzaChcInByb3RvLmhpPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9oaShcIithcmdzLmpvaW4oXCIsXCIpK1wiKXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFtcIih0eXBlb2YgaVwiLGksXCIhPT0nbnVtYmVyJ3x8aVwiLGksXCI8MCk/dGhpcy5zaGFwZVtcIiwgaSwgXCJdOmlcIiwgaSxcInwwXCJdLmpvaW4oXCJcIilcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJ0aGlzLnN0cmlkZVtcIitpICsgXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIix0aGlzLm9mZnNldCl9XCIpXG4gIFxuICAvL3ZpZXcubG8oKTpcbiAgdmFyIGFfdmFycyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwiYVwiK2krXCI9dGhpcy5zaGFwZVtcIitpK1wiXVwiIH0pXG4gIHZhciBjX3ZhcnMgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImNcIitpK1wiPXRoaXMuc3RyaWRlW1wiK2krXCJdXCIgfSlcbiAgY29kZS5wdXNoKFwicHJvdG8ubG89ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2xvKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3ZhciBiPXRoaXMub2Zmc2V0LGQ9MCxcIithX3ZhcnMuam9pbihcIixcIikrXCIsXCIrY192YXJzLmpvaW4oXCIsXCIpKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIGNvZGUucHVzaChcblwiaWYodHlwZW9mIGlcIitpK1wiPT09J251bWJlcicmJmlcIitpK1wiPj0wKXtcXFxuZD1pXCIraStcInwwO1xcXG5iKz1jXCIraStcIipkO1xcXG5hXCIraStcIi09ZH1cIilcbiAgfVxuICBjb2RlLnB1c2goXCJyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYVwiK2lcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJjXCIraVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLGIpfVwiKVxuICBcbiAgLy92aWV3LnN0ZXAoKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uc3RlcD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfc3RlcChcIithcmdzLmpvaW4oXCIsXCIpK1wiKXt2YXIgXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYVwiK2krXCI9dGhpcy5zaGFwZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiK2krXCI9dGhpcy5zdHJpZGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLGM9dGhpcy5vZmZzZXQsZD0wLGNlaWw9TWF0aC5jZWlsXCIpXG4gIGZvcih2YXIgaT0wOyBpPGRpbWVuc2lvbjsgKytpKSB7XG4gICAgY29kZS5wdXNoKFxuXCJpZih0eXBlb2YgaVwiK2krXCI9PT0nbnVtYmVyJyl7XFxcbmQ9aVwiK2krXCJ8MDtcXFxuaWYoZDwwKXtcXFxuYys9YlwiK2krXCIqKGFcIitpK1wiLTEpO1xcXG5hXCIraStcIj1jZWlsKC1hXCIraStcIi9kKVxcXG59ZWxzZXtcXFxuYVwiK2krXCI9Y2VpbChhXCIraStcIi9kKVxcXG59XFxcbmJcIitpK1wiKj1kXFxcbn1cIilcbiAgfVxuICBjb2RlLnB1c2goXCJyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYVwiICsgaVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImJcIiArIGlcbiAgICB9KS5qb2luKFwiLFwiKStcIixjKX1cIilcbiAgXG4gIC8vdmlldy50cmFuc3Bvc2UoKTpcbiAgdmFyIHRTaGFwZSA9IG5ldyBBcnJheShkaW1lbnNpb24pXG4gIHZhciB0U3RyaWRlID0gbmV3IEFycmF5KGRpbWVuc2lvbilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICB0U2hhcGVbaV0gPSBcImFbaVwiK2krXCJdXCJcbiAgICB0U3RyaWRlW2ldID0gXCJiW2lcIitpK1wiXVwiXG4gIH1cbiAgY29kZS5wdXNoKFwicHJvdG8udHJhbnNwb3NlPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl90cmFuc3Bvc2UoXCIrYXJncytcIil7XCIrXG4gICAgYXJncy5tYXAoZnVuY3Rpb24obixpZHgpIHsgcmV0dXJuIG4gKyBcIj0oXCIgKyBuICsgXCI9PT11bmRlZmluZWQ/XCIgKyBpZHggKyBcIjpcIiArIG4gKyBcInwwKVwifSkuam9pbihcIjtcIiksXG4gICAgXCJ2YXIgYT10aGlzLnNoYXBlLGI9dGhpcy5zdHJpZGU7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK3RTaGFwZS5qb2luKFwiLFwiKStcIixcIit0U3RyaWRlLmpvaW4oXCIsXCIpK1wiLHRoaXMub2Zmc2V0KX1cIilcbiAgXG4gIC8vdmlldy5waWNrKCk6XG4gIGNvZGUucHVzaChcInByb3RvLnBpY2s9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3BpY2soXCIrYXJncytcIil7dmFyIGE9W10sYj1bXSxjPXRoaXMub2Zmc2V0XCIpXG4gIGZvcih2YXIgaT0wOyBpPGRpbWVuc2lvbjsgKytpKSB7XG4gICAgY29kZS5wdXNoKFwiaWYodHlwZW9mIGlcIitpK1wiPT09J251bWJlcicmJmlcIitpK1wiPj0wKXtjPShjK3RoaXMuc3RyaWRlW1wiK2krXCJdKmlcIitpK1wiKXwwfWVsc2V7YS5wdXNoKHRoaXMuc2hhcGVbXCIraStcIl0pO2IucHVzaCh0aGlzLnN0cmlkZVtcIitpK1wiXSl9XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwidmFyIGN0b3I9Q1RPUl9MSVNUW2EubGVuZ3RoKzFdO3JldHVybiBjdG9yKHRoaXMuZGF0YSxhLGIsYyl9XCIpXG4gICAgXG4gIC8vQWRkIHJldHVybiBzdGF0ZW1lbnRcbiAgY29kZS5wdXNoKFwicmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoZGF0YSxzaGFwZSxzdHJpZGUsb2Zmc2V0KXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIihkYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInNoYXBlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJzdHJpZGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLG9mZnNldCl9XCIpXG5cbiAgLy9Db21waWxlIHByb2NlZHVyZVxuICB2YXIgcHJvY2VkdXJlID0gbmV3IEZ1bmN0aW9uKFwiQ1RPUl9MSVNUXCIsIFwiT1JERVJcIiwgY29kZS5qb2luKFwiXFxuXCIpKVxuICByZXR1cm4gcHJvY2VkdXJlKENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdLCBvcmRlcilcbn1cblxuZnVuY3Rpb24gYXJyYXlEVHlwZShkYXRhKSB7XG4gIGlmKGhhc0J1ZmZlcikge1xuICAgIGlmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkge1xuICAgICAgcmV0dXJuIFwiYnVmZmVyXCJcbiAgICB9XG4gIH1cbiAgaWYoaGFzVHlwZWRBcnJheXMpIHtcbiAgICBzd2l0Y2goT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGEpKSB7XG4gICAgICBjYXNlIFwiW29iamVjdCBGbG9hdDY0QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImZsb2F0NjRcIlxuICAgICAgY2FzZSBcIltvYmplY3QgRmxvYXQzMkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJmbG9hdDMyXCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDhBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiaW50OFwiXG4gICAgICBjYXNlIFwiW29iamVjdCBJbnQxNkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJpbnQxNlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBJbnQzMkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJpbnQzMlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50OEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50OFwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50MTZBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDE2XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQzMkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50MzJcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDhDbGFtcGVkQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQ4X2NsYW1wZWRcIlxuICAgIH1cbiAgfVxuICBpZihBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgcmV0dXJuIFwiYXJyYXlcIlxuICB9XG4gIHJldHVybiBcImdlbmVyaWNcIlxufVxuXG52YXIgQ0FDSEVEX0NPTlNUUlVDVE9SUyA9IHtcbiAgXCJmbG9hdDMyXCI6W10sXG4gIFwiZmxvYXQ2NFwiOltdLFxuICBcImludDhcIjpbXSxcbiAgXCJpbnQxNlwiOltdLFxuICBcImludDMyXCI6W10sXG4gIFwidWludDhcIjpbXSxcbiAgXCJ1aW50MTZcIjpbXSxcbiAgXCJ1aW50MzJcIjpbXSxcbiAgXCJhcnJheVwiOltdLFxuICBcInVpbnQ4X2NsYW1wZWRcIjpbXSxcbiAgXCJidWZmZXJcIjpbXSxcbiAgXCJnZW5lcmljXCI6W11cbn1cblxuOyhmdW5jdGlvbigpIHtcbiAgZm9yKHZhciBpZCBpbiBDQUNIRURfQ09OU1RSVUNUT1JTKSB7XG4gICAgQ0FDSEVEX0NPTlNUUlVDVE9SU1tpZF0ucHVzaChjb21waWxlQ29uc3RydWN0b3IoaWQsIC0xKSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHdyYXBwZWROREFycmF5Q3RvcihkYXRhLCBzaGFwZSwgc3RyaWRlLCBvZmZzZXQpIHtcbiAgaWYoZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGN0b3IgPSBDQUNIRURfQ09OU1RSVUNUT1JTLmFycmF5WzBdXG4gICAgcmV0dXJuIGN0b3IoW10pXG4gIH0gZWxzZSBpZih0eXBlb2YgZGF0YSA9PT0gXCJudW1iZXJcIikge1xuICAgIGRhdGEgPSBbZGF0YV1cbiAgfVxuICBpZihzaGFwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc2hhcGUgPSBbIGRhdGEubGVuZ3RoIF1cbiAgfVxuICB2YXIgZCA9IHNoYXBlLmxlbmd0aFxuICBpZihzdHJpZGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0cmlkZSA9IG5ldyBBcnJheShkKVxuICAgIGZvcih2YXIgaT1kLTEsIHN6PTE7IGk+PTA7IC0taSkge1xuICAgICAgc3RyaWRlW2ldID0gc3pcbiAgICAgIHN6ICo9IHNoYXBlW2ldXG4gICAgfVxuICB9XG4gIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgb2Zmc2V0ID0gMFxuICAgIGZvcih2YXIgaT0wOyBpPGQ7ICsraSkge1xuICAgICAgaWYoc3RyaWRlW2ldIDwgMCkge1xuICAgICAgICBvZmZzZXQgLT0gKHNoYXBlW2ldLTEpKnN0cmlkZVtpXVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB2YXIgZHR5cGUgPSBhcnJheURUeXBlKGRhdGEpXG4gIHZhciBjdG9yX2xpc3QgPSBDQUNIRURfQ09OU1RSVUNUT1JTW2R0eXBlXVxuICB3aGlsZShjdG9yX2xpc3QubGVuZ3RoIDw9IGQrMSkge1xuICAgIGN0b3JfbGlzdC5wdXNoKGNvbXBpbGVDb25zdHJ1Y3RvcihkdHlwZSwgY3Rvcl9saXN0Lmxlbmd0aC0xKSlcbiAgfVxuICB2YXIgY3RvciA9IGN0b3JfbGlzdFtkKzFdXG4gIHJldHVybiBjdG9yKGRhdGEsIHNoYXBlLCBzdHJpZGUsIG9mZnNldClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3cmFwcGVkTkRBcnJheUN0b3Jcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcikiLCJcInVzZSBzdHJpY3RcIlxuXG5mdW5jdGlvbiBpb3RhKG4pIHtcbiAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheShuKVxuICBmb3IodmFyIGk9MDsgaTxuOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSBpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlvdGEiLCJ2YXIgbm93ID0gcmVxdWlyZSgncGVyZm9ybWFuY2Utbm93JylcbiAgLCBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHt9IDogd2luZG93XG4gICwgdmVuZG9ycyA9IFsnbW96JywgJ3dlYmtpdCddXG4gICwgc3VmZml4ID0gJ0FuaW1hdGlvbkZyYW1lJ1xuICAsIHJhZiA9IGdsb2JhbFsncmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgY2FmID0gZ2xvYmFsWydjYW5jZWwnICsgc3VmZml4XSB8fCBnbG9iYWxbJ2NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxuICAsIGlzTmF0aXZlID0gdHJ1ZVxuXG5mb3IodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXJhZjsgaSsrKSB7XG4gIHJhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ1JlcXVlc3QnICsgc3VmZml4XVxuICBjYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWwnICsgc3VmZml4XVxuICAgICAgfHwgZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG59XG5cbi8vIFNvbWUgdmVyc2lvbnMgb2YgRkYgaGF2ZSByQUYgYnV0IG5vdCBjQUZcbmlmKCFyYWYgfHwgIWNhZikge1xuICBpc05hdGl2ZSA9IGZhbHNlXG5cbiAgdmFyIGxhc3QgPSAwXG4gICAgLCBpZCA9IDBcbiAgICAsIHF1ZXVlID0gW11cbiAgICAsIGZyYW1lRHVyYXRpb24gPSAxMDAwIC8gNjBcblxuICByYWYgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIF9ub3cgPSBub3coKVxuICAgICAgICAsIG5leHQgPSBNYXRoLm1heCgwLCBmcmFtZUR1cmF0aW9uIC0gKF9ub3cgLSBsYXN0KSlcbiAgICAgIGxhc3QgPSBuZXh0ICsgX25vd1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNwID0gcXVldWUuc2xpY2UoMClcbiAgICAgICAgLy8gQ2xlYXIgcXVldWUgaGVyZSB0byBwcmV2ZW50XG4gICAgICAgIC8vIGNhbGxiYWNrcyBmcm9tIGFwcGVuZGluZyBsaXN0ZW5lcnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgZnJhbWUncyBxdWV1ZVxuICAgICAgICBxdWV1ZS5sZW5ndGggPSAwXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKCFjcFtpXS5jYW5jZWxsZWQpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgY3BbaV0uY2FsbGJhY2sobGFzdClcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBNYXRoLnJvdW5kKG5leHQpKVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKHtcbiAgICAgIGhhbmRsZTogKytpZCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIGNhbmNlbGxlZDogZmFsc2VcbiAgICB9KVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgY2FmID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihxdWV1ZVtpXS5oYW5kbGUgPT09IGhhbmRsZSkge1xuICAgICAgICBxdWV1ZVtpXS5jYW5jZWxsZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZm4pIHtcbiAgLy8gV3JhcCBpbiBhIG5ldyBmdW5jdGlvbiB0byBwcmV2ZW50XG4gIC8vIGBjYW5jZWxgIHBvdGVudGlhbGx5IGJlaW5nIGFzc2lnbmVkXG4gIC8vIHRvIHRoZSBuYXRpdmUgckFGIGZ1bmN0aW9uXG4gIGlmKCFpc05hdGl2ZSkge1xuICAgIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZuKVxuICB9XG4gIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZ1bmN0aW9uKCkge1xuICAgIHRyeXtcbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICB9XG4gIH0pXG59XG5tb2R1bGUuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgY2FmLmFwcGx5KGdsb2JhbCwgYXJndW1lbnRzKVxufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIGdldE5hbm9TZWNvbmRzLCBocnRpbWUsIGxvYWRUaW1lO1xuXG4gIGlmICgodHlwZW9mIHBlcmZvcm1hbmNlICE9PSBcInVuZGVmaW5lZFwiICYmIHBlcmZvcm1hbmNlICE9PSBudWxsKSAmJiBwZXJmb3JtYW5jZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MgIT09IG51bGwpICYmIHByb2Nlc3MuaHJ0aW1lKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZ2V0TmFub1NlY29uZHMoKSAtIGxvYWRUaW1lKSAvIDFlNjtcbiAgICB9O1xuICAgIGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lO1xuICAgIGdldE5hbm9TZWNvbmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaHI7XG4gICAgICBociA9IGhydGltZSgpO1xuICAgICAgcmV0dXJuIGhyWzBdICogMWU5ICsgaHJbMV07XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IGdldE5hbm9TZWNvbmRzKCk7XG4gIH0gZWxzZSBpZiAoRGF0ZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gRGF0ZS5ub3coKTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8qXG4vL0Agc291cmNlTWFwcGluZ1VSTD1wZXJmb3JtYW5jZS1ub3cubWFwXG4qL1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIvLyBjaGF0L2NvcmUuanNcclxuLy8gVGhlIGNvcmUgb2YgdGhlIGNoYXQgc2ltdWxhdGlvbiBiZWhhdmlvclxyXG5cclxuLy8gdmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcbnZhciBkb25nZXIgPSByZXF1aXJlKFwiLi9kb25nZXIuanNcIik7XHJcblxyXG5mdW5jdGlvbiBjdXJyVGltZSgpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9XHJcblxyXG4vKipcclxuICogXHJcbiAqL1xyXG5mdW5jdGlvbiBDaGF0KCkge1xyXG5cdHRoaXMuX2luaXRVc2VybGlzdCgpO1xyXG5cdHRoaXMuX2luaXRDaGF0U3Bhd25Mb29wKCk7XHJcblx0XHJcblx0dGhpcy5faW5pdFZpc2l0b3JFdmVudHMoKTtcclxufVxyXG4vLyBpbmhlcml0cyhDaGF0LCApO1xyXG5leHRlbmQoQ2hhdC5wcm90b3R5cGUsIHtcclxuXHRcclxuXHRfdV9saXN0IDogW10sIC8vY29udGFpbnMgdGhlIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0X3VfaGFzaCA6IHt9LCAvL2NvbnRhaW5zIGEgaGFzaCBvZiB1c2VybmFtZXMgdG8gdXNlcnNcclxuXHRfdV9jbGFzc2VzOiB7XHJcblx0XHRjaGF0bGVhZGVyOiBbXSxcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0X2luaXRVc2VybGlzdCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHVsID0gcmVxdWlyZShcIi4vdXNlcmxpc3RcIik7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHVsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciB1ID0gbmV3IFVzZXIodWxbaV0pO1xyXG5cdFx0XHR0aGlzLl91X2xpc3QucHVzaCh1KTtcclxuXHRcdFx0dGhpcy5fdV9oYXNoW3UubmFtZV0gPSB1O1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCF0aGlzLnBsYXllclVzZXIpIHtcclxuXHRcdFx0XHQvL1RoZSBmaXJzdCB1c2VyIGlzIHRoZSBwbGF5ZXIncyB1c2VyXHJcblx0XHRcdFx0dGhpcy5wbGF5ZXJVc2VyID0gdTsgXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF9yYW5kb21Vc2VyIDogZnVuY3Rpb24odGltZSl7XHJcblx0XHR0aW1lID0gdGltZSB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHRcdHZhciBpbmRleDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMjA7IGkrKykgeyAvL3RyeSB1cCB0byBvbmx5IDIwIHRpbWVzXHJcblx0XHRcdGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5fdV9saXN0Lmxlbmd0aCk7XHJcblx0XHRcdHZhciB1ID0gdGhpcy5fdV9saXN0W2luZGV4XTtcclxuXHRcdFx0aWYgKHUubmV4dFRpbWVUYWxrID4gdGltZSkgcmV0dXJuIHU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vSWYgd2UgY2FuJ3QgZmluZCBhIHVzZXIgdG8gcmV0dXJuLCBtYWtlIGEgbmV3IG9uZSBhcyBhIGZhbGxiYWNrXHJcblx0XHR2YXIgdSA9IG5ldyBVc2VyKHtuYW1lOiBcImd1ZXN0XCIrIChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMDAwMCkgKyAxMDAwMCkgfSk7XHJcblx0XHR0aGlzLl91X2xpc3QucHVzaCh1KTtcclxuXHRcdHRoaXMuX3VfaGFzaFt1Lm5hbWVdID0gdTtcclxuXHRcdHJldHVybiB1O1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0X2N1cnJDaGF0TW9kZSA6IG51bGwsXHJcblx0X2luaXRDaGF0U3Bhd25Mb29wIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdHNlbGYuX2N1cnJDaGF0TW9kZSA9IFwibG9hZGluZ1wiO1xyXG5cdFx0c2V0VGltZW91dChjaGF0VGljaywgMzAwMCk7XHJcblx0XHRcclxuXHRcdHNlbGYuc2V0Q2hhdE1vZGUgPSBmdW5jdGlvbihtb2RlKSB7XHJcblx0XHRcdHNlbGYuX2N1cnJDaGF0TW9kZSA9IG1vZGU7XHJcblx0XHRcdHNldFRpbWVvdXQoY2hhdFRpY2ssIDApO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gY2hhdFRpY2soKSB7XHJcblx0XHRcdHZhciBuZXh0VXBkYXRlID0gc2VsZi51cGRhdGVDaGF0KCk7XHJcblx0XHRcdGlmIChuZXh0VXBkYXRlIDwgMCkgcmV0dXJuO1xyXG5cdFx0XHRzZXRUaW1lb3V0KGNoYXRUaWNrLCBuZXh0VXBkYXRlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHNldENoYXRNb2RlIDogZnVuY3Rpb24oKXt9LFxyXG5cdFxyXG5cdHVwZGF0ZUNoYXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHN3aXRjaCAodGhpcy5fY3VyckNoYXRNb2RlKSB7XHJcblx0XHRcdGNhc2UgXCJub3JtYWxcIjpcclxuXHRcdFx0XHR0aGlzLnNwYXduQ2hhdE1lc3NhZ2UoKTtcclxuXHRcdFx0XHRyZXR1cm4gMzAwICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQwMCk7XHJcblx0XHRcdGNhc2UgXCJsb2FkaW5nXCI6XHJcblx0XHRcdFx0Ly9UT0RPXHJcblx0XHRcdFx0cmV0dXJuIC0xO1xyXG5cdFx0XHRjYXNlIFwiZGlzY29ubmVjdGVkXCI6XHJcblx0XHRcdFx0Ly9UT0RPXHJcblx0XHRcdFx0cmV0dXJuIDEwMDA7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfY3R4X3Bvb2wgOiBbXSwgLy8gQ29udGV4dHMgdGhhdCBhcmUgYWN0aXZlIG9yIGhhdmUgbm90IHlldCB0aW1lZCBvdXRcclxuXHQvLyBMb25nIHRlcm0gY29udGV4dHM6XHJcblx0X2N0eF9sb2NhdGlvbiA6IG51bGwsIC8vIFRoZSBjb250ZXh0IGZvciB0aGUgY3VycmVudCBsb2NhdGlvblxyXG5cdF9jdHhfb2NjYXNpb24gOiBudWxsLCAvLyBUaGUgY29udGV4dCBmb3IgdGhlIGN1cnJlbnQgb2NjYXNpb25cclxuXHRcclxuXHQvKiogQWRkcyBhIENoYXQgQ29udGV4dCB0byB0aGUgY29udGV4dCBwb29sLiAqL1xyXG5cdGFkZENvbnRleHQgOiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGN0eC50aW1lc3RhbXAgPSBjdXJyVGltZSgpO1xyXG5cdFx0dGhpcy5fY3R4X3Bvb2wucHVzaChjdHgpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRzZXRMb2NhdGlvbkNvbnRleHQgOiBmdW5jdGlvbihjb250ZXh0KSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiAqL1xyXG5cdF90aWNrX21hbmFnZUNvbnRleHRzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgZGF0ZSA9IGN1cnJUaW1lKCk7XHJcblx0XHRcclxuXHRcdC8vIFBydW5lIHRpbWVkLW91dCBjb250ZXh0c1xyXG5cdFx0dmFyIHBvb2wgPSB0aGlzLl9jdHhfcG9vbDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcG9vbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAocG9vbFtpXS5pc1RpbWVkb3V0KGRhdGUpKSB7XHJcblx0XHRcdFx0cG9vbC5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0aS0tO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRwbGF5ZXJVc2VyOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0VmlzaXRvckV2ZW50cyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0JChmdW5jdGlvbigpe1xyXG5cdFx0XHRcclxuXHRcdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwia2V5cHJlc3NcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0gMTMgJiYgIWUuc2hpZnRLZXkgJiYgIWUuY3RybEtleSkgeyAvLyBFbnRlclxyXG5cdFx0XHRcdFx0dmFyIG1zZyA9ICQoXCIjY2hhdGJveFwiKS52YWwoKTtcclxuXHRcdFx0XHRcdCQoXCIjY2hhdGJveFwiKS52YWwoXCJcIik7XHJcblx0XHRcdFx0XHRpZiAobXNnLmluZGV4T2YoXCIvXCIpICE9IDApIHtcclxuXHRcdFx0XHRcdFx0c2VsZi5wdXRNZXNzYWdlKHNlbGYucGxheWVyVXNlciwgbXNnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vUHJvY2VzcyBjaGF0IG1lc3NhZ2VcclxuXHRcdFx0XHRcdHNlbGYuX3Byb2Nlc3NQbGF5ZXJDaGF0TWVzc2FnZShtc2cpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdFxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfcHJvY2Vzc1BsYXllckNoYXRNZXNzYWdlIDogZnVuY3Rpb24obXNnKSB7XHJcblx0XHR2YXIgcmVzO1xyXG5cdFx0aWYgKHJlcyA9IC9eKHVwfGRvd258bGVmdHxyaWdodHxzdGFydHxzZWxlY3R8YnxhKS9pLmV4ZWMobXNnKSkge1xyXG5cdFx0XHRjb250cm9sbGVyLnN1Ym1pdENoYXRLZXlwcmVzcyhyZXNbMV0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdC8qKiBcclxuXHQgKiBQdXRzIGEgbWVzc2FnZSBpbnRvIHRoZSBjaGF0LlxyXG5cdCAqL1xyXG5cdHB1dE1lc3NhZ2UgOiBmdW5jdGlvbih1c2VyLCB0ZXh0KSB7XHJcblx0XHRpZiAodHlwZW9mIHVzZXIgPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0dXNlciA9IHRoaXMuX3VfaGFzaFt1c2VyXTtcclxuXHRcdFxyXG5cdFx0dmFyIGxpbmUgPSAkKFwiPGxpPlwiKS5hZGRDbGFzcyhcImNoYXQtbGluZVwiKTtcclxuXHRcdHZhciBiYWRnZXMgPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwiYmFkZ2VzXCIpO1xyXG5cdFx0dmFyIGZyb20gPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwiZnJvbVwiKTtcclxuXHRcdHZhciBjb2xvbiA9IG51bGw7XHJcblx0XHR2YXIgbXNnID0gJChcIjxzcGFuPlwiKS5hZGRDbGFzcyhcIm1lc3NhZ2VcIik7XHJcblx0XHRcclxuXHRcdC8vIFN0eWxlIHRoZSBtZXNzYWdlXHJcblx0XHRpZiAodXNlci5iYWRnZXMpIGJhZGdlcy5hcHBlbmQodXNlci5iYWRnZXMpO1xyXG5cdFx0ZnJvbS5odG1sKHVzZXIubmFtZSk7XHJcblx0XHRmcm9tLmNzcyh7IFwiY29sb3JcIjogdXNlci5jb2xvciB9KTtcclxuXHRcdFxyXG5cdFx0Ly9Qcm9jZXNzIG1lc3NhZ2VcclxuXHRcdC8vVE9ETyByZXBsYWNlIGRvbmdlciBwbGFjZWhvbGRlcnMgaGVyZVxyXG5cdFx0dGV4dCA9IGRvbmdlci5kb25nZXJmeSh0ZXh0KTtcclxuXHRcdFxyXG5cdFx0Ly8gRXNjYXBlIEhUTUxcclxuXHRcdHRleHQgPSBtc2cudGV4dCh0ZXh0KS5odG1sKCk7XHJcblx0XHRcclxuXHRcdC8vIFJlcGxhY2UgVHdpdGNoIGVtb3Rlc1xyXG5cdFx0dGV4dCA9IGRvbmdlci50d2l0Y2hpZnkodGV4dCk7XHJcblx0XHRcclxuXHRcdG1zZy5odG1sKHRleHQpO1xyXG5cdFx0XHJcblx0XHRpZiAoIXRleHQuc3RhcnRzV2l0aChcIi9tZSBcIikpIHtcclxuXHRcdFx0Y29sb24gPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwiY29sb25cIikuaHRtbChcIjpcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtc2cuY3NzKHsgXCJjb2xvclwiOiB1c2VyLmNvbG9yIH0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRsaW5lLmFwcGVuZChiYWRnZXMsIGZyb20sIGNvbG9uLCBtc2cpO1xyXG5cdFx0XHJcblx0XHQkKFwiI2NoYXQtbGluZXNcIikuYXBwZW5kKGxpbmUpO1xyXG5cdH0sXHJcblxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2hhdCgpO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHNwYXduQ2hhdE1lc3NhZ2UoKSB7XHJcblx0dmFyIGRhdGUgPSBjdXJyVGltZSgpO1xyXG5cdFx0XHJcblx0Ly8gXHJcblx0dmFyIHBvb2wgPSB0aGlzLl9jdHhfcG9vbDtcclxuXHR2YXIgZGlzdFBvb2wgPSBbXTtcclxuXHR2YXIgYWNjdW0gPSAwO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcG9vbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGluZiA9IHBvb2xbaV0uZ2V0SW5mbHVlbmNlKCk7XHJcblx0XHRpZiAoaW5mIDwgMCkgaW5mID0gMDtcclxuXHRcdFxyXG5cdFx0YWNjdW0gKz0gaW5mO1xyXG5cdFx0ZGlzdFBvb2wucHVzaChhY2N1bSk7XHJcblx0fVxyXG5cdFxyXG5cdHZhciBpbmRleCA9IE1hdGgucmFuZG9tKCkgKiBhY2N1bTtcclxuXHR2YXIgc2VsQ3R4ID0gbnVsbDtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHBvb2wubGVuZ3RoOyBpKyspIHtcclxuXHRcdGlmIChpbmRleCA+IGRpc3RQb29sW2ldKSBjb250aW51ZTtcclxuXHRcdHNlbEN0eCA9IHBvb2xbaV07IGJyZWFrO1xyXG5cdH1cclxuXHRcclxuXHQvL0NvbnRleHQgdG8gcHVsbCBmcm9tIGlzIG5vdyBzZWxlY3RlZFxyXG5cdHZhciBtc2cgPSBzZWxDdHguZ2V0Q2hhdE1lc3NhZ2UoZGF0ZSk7XHJcblx0XHJcbn1cclxuQ2hhdC5zcGF3bkNoYXRNZXNzYWdlID0gc3Bhd25DaGF0TWVzc2FnZTtcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKi9cclxuZnVuY3Rpb24gVXNlcihvYmope1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBVc2VyKSkgcmV0dXJuIG5ldyBVc2VyKG9iaik7XHJcblx0XHJcblx0ZXh0ZW5kKHRoaXMsIG9iaik7XHJcbn1cclxuVXNlci5wcm90b3R5cGUgPSB7XHJcblx0bmFtZSA6IG51bGwsXHJcblx0Y29sb3IgOiBcIiMwMDAwMDBcIixcclxuXHRwb3N0bXNnIDogXCJcIixcclxuXHRwcmVtc2cgOiBcIlwiLFxyXG5cdGJhZGdlcyA6IG51bGwsXHJcblx0XHJcblx0bmV4dFRpbWVUYWxrOiAwLCAvL25leHQgdGltZSB0aGlzIHVzZXIgaXMgYWxsb3dlZCB0byB0YWxrXHJcblx0bGFzdFRpbWVvdXQ6IDAsIC8vdGhlIGxhc3QgdGltZW91dCB0aGlzIHVzZXIgaGFkLCBpbiBzZWNvbmRzLiBNb3JlIHRoYW4gNSBzZWNvbmRzIGluZGljYXRlcyBhIGJhbiBtb21lbnQuXHJcblx0XHJcbn07XHJcbiIsIi8vIGRvbmdlci5qc1xyXG4vLyBGb3IgZWFzeSBkZWZpbml0aW9uIG9mIGRvbmdlcnMgYW5kIFR3aXRjaCBlbW90ZXNcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGRvbmdlcmZ5IDogZnVuY3Rpb24oc3RyKSB7XHJcblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcPGQ6KFxcdyspXFw+L2lnLCBmdW5jdGlvbihtYXRjaCwgcDEpe1xyXG5cdFx0XHRyZXR1cm4gZG9uZ2Vyc1twMV0gfHwgXCJcIjtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0dHdpdGNoaWZ5IDogZnVuY3Rpb24oc3RyKSB7XHJcblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UodHdpdGNoRW1vdGVQYXR0ZXJuLCBmdW5jdGlvbihtYXRjaCl7XHJcblx0XHRcdHJldHVybiAnPHNwYW4gY2xhc3M9XCJ0d2l0Y2hlbW90ZSBlbS0nK21hdGNoKydcIj48L3NwYW4+JztcclxuXHRcdH0pO1xyXG5cdH0sXHJcbn1cclxuXHJcbnZhciB0d2l0Y2hFbW90ZVBhdHRlcm4gPSBuZXcgUmVnRXhwKFtcclxuXHRcIkRhbnNHYW1lXCIsXHJcblx0XCJQcmFpc2VJdFwiLFxyXG5cdFwiQmlibGVUaHVtcFwiLFxyXG5cdFwiQmxvb2RUcmFpbFwiLFxyXG5cdFwiUEpTYWx0XCIsXHJcblx0XCJCYWJ5UmFnZVwiLFxyXG5cdFwiSGV5R3V5c1wiLFxyXG5cdFwiQmlvbmljQnVuaW9uXCIsXHJcblx0XCJSZXNpZGVudFNsZWVwZXJcIixcclxuXHRcIldpbldha2VyXCIsXHJcblx0XCJTaGliZVpcIixcclxuXHRcIkJpZ0Jyb3RoZXJcIixcclxuXHRcIkRhdFNoZWZmeVwiLFxyXG5cdFwiQnJva2VCYWNrXCIsXHJcblx0XCJFbGVHaWdnbGVcIixcclxuXHRcIlRyaUhhcmRcIixcclxuXHRcIk9NR1Njb290c1wiLFxyXG5cdFwiUG9nQ2hhbXBcIixcclxuXHRcIkthcHBhXCIsXHJcblx0XCJTb29uZXJMYXRlclwiLFxyXG5cdFwiS2FwcGFIRFwiLFxyXG5cdFwiQnJhaW5TbHVnXCIsXHJcblx0XCJTd2lmdFJhZ2VcIixcclxuXHRcIkZhaWxGaXNoXCIsXHJcblx0XCJNckRlc3RydWN0b2lkXCIsXHJcblx0XCJEQlN0eWxlXCIsXHJcblx0XCJPcGllT1BcIixcclxuXHRcIkdhc0pva2VyXCIsXHJcblx0XCI0SGVhZFwiLFxyXG5cdFwiS2V2aW5UdXJ0bGVcIixcclxuXHRcIktlZXBvXCIsXHJcblx0XCJPbmVIYW5kXCIsXHJcblx0XCJLQVBPV1wiLFxyXG5cdFwiS3JleWdhc21cIixcclxuXS5qb2luKFwifFwiKSwgXCJnXCIpO1xyXG5cclxudmFyIGRvbmdlcnMgPSB7XHJcblx0XCJyaW90XCIgOiBcIuODveC8vOC6iNmEzZzguojgvL3vvolcIixcclxuXHRcInJpb3RvdmVyXCI6IFwi4pSM4Ly84LqI2YTNnOC6iOC8veKUkFwiLFxyXG5cdFwic29waGlzdGljYXRlZFwiIDogXCLjg73gvLzguojZhM2c4LKw4LOD4Ly9776JXCIsXHJcblx0XCJwcmFpc2VcIiA6IFwi4Ly8IOOBpCDil5Vf4peVIOC8veOBpFwiLFxyXG5cdFwicnVubmluZ21hblwiOiBcIuGVleC8vOC6iNmEzZzguojgvL3hlZdcIixcclxuXHRcImRhbmNlXCIgOiBcIuKZqyDilIzgvLzguojZhM2c4LqI4Ly94pSYIOKZqlwiLFxyXG5cdFwibGVubnlcIjogXCIoIM2hwrAgzZzKliDNocKwKVwiLFxyXG5cdFwiZG9uZ2VyaG9vZFwiOiBcIuC8vCDCutmEzZ/CuiDgvLwgwrrZhM2fwrog4Ly8IMK62YTNn8K6IOC8vSDCutmEzZ/CuiDgvL0gwrrZhM2fwrog4Ly9XCIsXHJcblx0XHJcblx0XCJ0YWJsZWZsaXBcIiA6IFwiKOKVr8Kw4pahwrAp4pWv77i1IOKUu+KUgeKUu1wiLFxyXG5cdFwidGFibGViYWNrXCIgOiBcIuKUrOKUgOKUrOODjijgsqBf4LKg44OOKVwiLFxyXG5cdFwidGFibGVmbGlwMlwiIDogXCIo44OO4LKg55uK4LKgKeODjiDilLvilIHilLtcIixcclxuXHRcInRhYmxlYmFjazJcIiA6IFwi4pSs4pSA4pSs44OOKOCyoOebiuCyoOODjilcIixcclxuXHRcInRhYmxlZmxpcDNcIiA6IFwi4pS74pSB4pS7IO+4teODvShg0JTCtCnvvonvuLUg4pS74pSB4pS7XCIsXHJcblx0XCJ0YWJsZWJhY2szXCIgOiBcIuKUrOKUgOKUrCDvuLXjg70o4LKgX+CyoCnvvonvuLUg4pSs4pSA4pSsXCIsXHJcblx0XCJ0YWJsZWZsaXA0XCIgOiBcIuKUrOKUgOKUrO+7vyDvuLUgLygu4pahLiBcXFxc77yJXCIsXHJcblx0XCJ0YWJsZWJhY2s0XCIgOiBcIi0oIMKwLcKwKS0g44OOKOCyoF/gsqDjg44pXCIsIFxyXG5cdFxyXG5cdFwid29vcGVyXCI6IFwi5Y2FKOKXleKAv+KXlSnljYVcIixcclxuXHRcImJyb256b25nZXJcIjogXCLilJQob9GqbynilJhcIixcclxuXHRcImRvb3RcIiA6IFwi4oq54oub4ouLKOKXkOKKneKXkSnii4zii5riirlcIixcclxuXHRcImpvbHRpa1wiOiBcIuKVrTw84peVwrDPicKw4peVPj7ila5cIixcclxuXHRcIm1lZ2Fkb25nZXJcIiA6IFwi4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWxXCIsXHJcblx0XCJ0cmFwbmljaFwiOiBcIuODveC8vOKcqu+5j+KcquC8ve++iVwiLFxyXG59O1xyXG5cclxuXHJcblxyXG52YXIgY29weXBhc3RhID0ge1xyXG5cdFwicmlvdHBvbGljZVwiIDogW1xyXG5cdFx0XCIo4paAzL8gzL/Eucyv4paAzL8gzL8pIFRISVMgSVMgVEhFIFJJT1QgUE9MSUNFLiBTVE9QIFJJT1RJTkcgTk9XICjiloDMvyDMv8S5zK/iloDMvyDMvylcIixcclxuXHRcdFwiKOKMkOKWoF/ilqApPS/MtS8nzL8nzL8gzL8gzL8g44O94Ly84LqI2YTNnOC6iOC8ve++iSBUSElTIElTIFRIRSBSSU9UIFBPTElDRSwgQ0VBU0UgUklPVElORyBPUiBJIFNIT09UIFRIRSBET05HRVIhIVwiLFxyXG5cdF0sXHJcblx0XCJsaWtlMnJhaXNlXCIgOiBcIkkgbGlrZSB0byByYWlzZSBteSBEb25nZXIgSSBkbyBpdCBhbGwgdGhlIHRpbWUg44O94Ly84LqI2YTNnOC6iOC8ve++iSBhbmQgZXZlcnkgdGltZSBpdHMgbG93ZXJlZOKUjOC8vOC6iNmEzZzguojgvL3ilJAgSSBjcnkgYW5kIHN0YXJ0IHRvIHdoaW5lIOKUjOC8vEDZhM2cQOC8veKUkEJ1dCBuZXZlciBuZWVkIHRvIHdvcnJ5IOC8vCDCutmEzZ/CuuC8vSBteSBEb25nZXIncyBzdGF5aW5nIHN0cm9uZyDjg73gvLzguojZhM2c4LqI4Ly9776JQSBEb25nZXIgc2F2ZWQgaXMgYSBEb25nZXIgZWFybmVkIHNvIHNpbmcgdGhlIERvbmdlciBzb25nISDhlabgvLzguojZhM2c4LqI4Ly94ZWkXCIsXHJcblx0XCJtZWdhZG9uZ2VyXCIgOiBbXHJcblx0XHRcIuKVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVsSBQUkFJU0UgVEhFIE1FR0EtRE9OR0VSIOKVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVsVwiLFxyXG5cdFx0XCLjg73gvLzguojZhM2c4LqI4Ly9776JIGRvbmdlcidzIGRvbmdpdGUgaXMgcmVhY3RpbmcgdG8gdGhlIG1lZ2Egc3RvbmUgKCjjg73gvLzguojZhM2c4LqI4Ly9776JKSkgZG9uZ2VyIGV2b2x2ZWQgaW50byBtZWdhIGRvbmdlciBcXFwi4pWyL+C8vOC6iOC6iNmEzZzguojguojgvL0v4pWxXFxcIiBtZWdhIGRvbmdlciB1c2VkIHJhaXNlLCBpdCdzIHN1cGVyIGVmZmVjdGl2ZSB3aWxkIGxvd2VyZWQgZG9uZyBmYWludGVkXCIsXHJcblx0XHRcIuODveC8vOC6iNmEzZzguojgvL3vvokgRG9uZ2VyIGlzIHJlYWN0aW5nIHRvIHRoZSBEb25nZXJpdGUhICwv4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWxLCBEb25nZXIgTWVnYSBFdm9sdmVkIGludG8gTWVnYSBEb25nZXIhXCIsXHJcblx0XHRcIkRPTkdFUidTIERPTkdFUklURSBJUyBSRUFDVElORyBUTyBUSEUgTUVHQSBSSU5HISAsL+KVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVse+7vywgTUVHQSBSSU9UICwv4pWyL+KVreC8vOC6iOC6iNmEzZzguojguojgvL3ila4v4pWx77u/LFwiLFxyXG5cdF0sXHJcblx0XCJyaXBkb29mXCIgOiBcIkkuLi4gSSBqdXN0IHdhbnRlZCB0byBkZXBvc2l0IEJpZG9vZi4gU2hlIHdhcyBzbyBnb29kIHRvIHVzLi4uIGFsd2F5cyBzbyBsb3lhbC4gV2hlbiBzaGUgY291bGRuJ3QgZXZvbHZlIGZvciB1cywgc2hlIHdlbnQgdG8gdGhlIERheWNhcmUgaGFwcGlseSwgYW5kIHRoZW4gY2FtZSBiYWNrIGhhcHBpbHksIHdlYXJpbmcgdGhhdCBzdHVwaWQgZ3JpbiBvbiBoZXIgZmFjZSBhbGwgdGhlIHdoaWxlLiBXaGVuIHdlIGFza2VkIGhlciB0byBnbyB0byB0aGUgUEMsIHNoZSBuZXZlciBvbmNlIGNvbXBsYWluZWQuIFNoZSB3YXMganVzdCB0aGVyZSBmb3IgdXMsIGxveWFsbHksIHRoZSB3YXkgc2hlIGFsd2F5cyBoYWQgYmVlbi4uLi5BbmQgdGhlbiB3ZSBraWxsZWQgaGVyLiBSSVAgRG9vZiwgeW91IHdpbGwgYmUgbWlzc2VkLiA6KFwiLFxyXG5cdFwidHdpdGNoXCIgOiBbXHJcblx0XHRcIkknbSBhIFR3aXRjaCBlbXBsb3llZSBhbmQgSSdtIHN0b3BwaW5nIGJ5IHRvIHNheSB5b3VyIFR3aXRjaCBjaGF0IGlzIG91dCBvZiBjb250cm9sLiBJIGhhdmUgcmVjZWl2ZWQgc2V2ZXJhbCBjb21wbGFpbnRzIGZyb20geW91ciB2ZXJ5IG93biB2aWV3ZXJzIHRoYXQgdGhlaXIgY2hhdCBleHBlcmllbmNlIGlzIHJ1aW5lZCBiZWNhdXNlIG9mIGNvbnN0YW50IEVtb3RlIGFuZCBDb3B5cGFzdGEgc3BhbW1pbmcuIFRoaXMgdHlwZSB1bmFjY2VwdGFibGUgYnkgVHdpdGNoJ3Mgc3RhbmRhcmRzIGFuZCBpZiB5b3VyIG1vZHMgZG9uJ3QgZG8gc29tZXRoaW5nIGFib3V0IGl0IHdlIHdpbGwgYmUgZm9yY2VkIHRvIHNodXQgZG93biB5b3VyIGNoYW5uZWwuIFdpc2ggeW91IGFsbCB0aGUgYmVzdCAtIFR3aXRjaFwiLFxyXG5cdFx0LyogUGFyayB2ZXJzaW9uICovXCJJJ20gYSBUd2l0Y2ggZW1wbG95ZWUgYW5kIEknbSBzdG9wcGluZyBieSB0byBzYXkgeW91ciBUd2l0Y2ggY2hhdCBsb29rcyB0b28gbXVjaCBsaWtlIHRoZSBvZmZpY2lhbCB0d2l0Y2ggY2hhdC4gSSBoYXZlIHJlY2VpdmVkIHNldmVyYWwgY29tcGxhaW50cyBmcm9tIHlvdXIgdmVyeSBvd24gdmlzaXRvcnMgdGhhdCB0aGVpciBjaGF0IGV4cGVyaWVuY2UgaXMgcnVpbmVkIGJlY2F1c2Ugb2YgY29uc3RhbnQgY2hhdCBiZWluZyBzcGFtbWVkIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuIFRoaXMgaXMgdW5hY2NlcHRhYmxlIGJ5IFR3aXRjaCdzIFRPUyBhbmQgaWYgeW91ciBtb2RzIGRvbid0IGRvIHNvbWV0aGluZyBhYm91dCBpdCB3ZSB3aWxsIGJlIGZvcmNlZCB0byBzaHV0IGRvd24geW91ciBwYXJrLiBXaXNoIHlvdSBhbGwgdGhlIGJlc3QgLSBUd2l0Y2hcIixcclxuXHRdLFxyXG5cdFwic3RpbGxhdGhpbmdcIiA6IFtcclxuXHRcdFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/XCIsXHJcblx0XHRcIklzIHRwcCBzdGlsbCBhIHRoaW5nPyBLYXBwYVwiLFxyXG5cdFx0XCJJcyBcXFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1wiLFxyXG5cdFx0XCJJcyBcXFwiSXMgXFxcIklzIHRwcCBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XCIsXHJcblx0XHRcIklzIFxcXCJJcyBcXFwiSXMgXFxcIklzIHRwcCBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1wiLFxyXG5cdFx0XCJJcyBcXFwiSXMgXFxcIklzIFxcXCJJcyBJcyBcXFwiSXMgXFxcIklzIFxcXCJJcyB0cHAgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz8gc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cIixcclxuXHRdLFxyXG5cdFwiZGFuY2VyaW90XCIgOiBbXHJcblx0XHRcIuKZqyDilIzgvLzguojZhM2c4LqI4Ly94pSYIERBTkNFIFJJT1Qg4pmqIOKUlOC8vOC6iNmEzZzguojgvL3ilJAg4pmrXCIsXHJcblx0XHRcIuKZqyDilIzgvLzguojZhM2c4LqI4Ly94pSYIOKZqiBEQU5DRSBSSU9UIOKZqiDilJTgvLzguojZhM2c4LqI4Ly94pSQIOKZq1wiLFxyXG5cdFx0XCLimasg4pSM4Ly84LqI2YTNnOC6iOC8veKUmCDimaogREFOQ0UgUklPVCDimasg4pSM4Ly84LqI2YTNnOC6iOC8veKUmCDimapcIixcclxuXHRdLFxyXG5cdFwicmlvdFwiIDogW1xyXG5cdFx0XCLjg73gvLzguojZhM2c4LqI4Ly9776JIFJJT1Qg44O94Ly84LqI2YTNnOC6iOC8ve++iVwiLFxyXG5cdF0sXHJcblx0XCJsZXRpdGRvbmdcIiA6IFwi44O94Ly84LqI2YTNnOC6iOC8ve++iSBMRVQgSVQgRE9ORywgTEVUIElUIERPTkcsIENPVUxETidUIFJJT1QgQkFDSyBBTllNT1JFLiBMRVQgSVQgRE9ORywgTEVUIElUIERPTkcsIExFVCdTIEdFVCBCQUNLIFRPIFRIRSBMT1JFLCBJIERPTidUIENBUkUgVEhBVCBUSEUgRE9OR0VSUyBXRVJFIEdPTkUsIExFVCBUSEUgRE9OR1MgUkFHRSBPTiwgVEhFIFJJT1QgTkVWRVIgQk9USEVSRUQgTUUgQU5ZV0FZLiDjg73gvLzguojZhM2c4LqI4Ly9776JXCIsXHJcblx0XHJcblx0XCJkb250c3BhbVwiIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgYSA9IFwic3BhbVwiO1xyXG5cdFx0Y29uc3QgcmVwbCA9IFtcIlJJT1RcIiwgXCJiZWF0IG1pc3R5XCIsIFwi4Ly8IOOBpCDil5Vf4peVIOC8veOBpFwiXTtcclxuXHRcdFxyXG5cdFx0Y29uc3Qgc3BhbSA9IFwiR3V5cyBjYW4geW91IHBsZWFzZSBub3QgWyVkXSB0aGUgY2hhdC4gTXkgbW9tIGJvdWdodCBtZSB0aGlzIG5ldyBsYXB0b3AgYW5kIGl0IGdldHMgcmVhbGx5IGhvdCB3aGVuIHRoZSBjaGF0IGlzIGJlaW5nIFslZF1lZC4gTm93IG15IGxlZyBpcyBzdGFydGluZyB0byBodXJ0IGJlY2F1c2UgaXQgaXMgZ2V0dGluZyBzbyBob3QuIFBsZWFzZSwgaWYgeW91IGRvbuKAmXQgd2FudCBtZSB0byBnZXQgYnVybmVkLCB0aGVuIGRvbnQgWyVkXSB0aGUgY2hhdFwiO1xyXG5cdH0sXHJcblx0XHJcblx0XCJhd2VmdWxodW1hbnNcIiA6IFwiSHVtYW5zIGFyZSBhd2Z1bC4gVGhpcyBwbGFuZXQgd291bGQgYmUgd2F5IGJldHRlciBpZiB0aGVyZSB3ZXJlIG5vIGh1bWFucyBpbiBpdC4gVHJ1ZSBzdG9yeS4gRE9OJ1QgQ09QWSBUSElTXCIsXHJcblx0XCJydWluZWRjaGF0XCIgOiBcIllvdSBndXlzIGFyZSBydWluaW5nIG15IHR3aXRjaCBjaGF0IGV4cGVyaWVuY2UuIEkgY29tZSB0byB0aGUgdHdpdGNoIGNoYXQgZm9yIG1hdHVyZSBjb252ZXJzYXRpb24gYWJvdXQgdGhlIGdhbWVwbGF5LCBvbmx5IHRvIGJlIGF3YXJkZWQgd2l0aCBrYXBwYSBmYWNlcyBhbmQgZnJhbmtlcnpzLiBQZW9wbGUgd2hvIHNwYW0gc2FpZCBmYWNlcyBuZWVkIG1lZGljYWwgYXR0ZW50aW9uIHV0bW9zdC4gVGhlIHR3aXRjaCBjaGF0IGlzIHNlcmlvdXMgYnVzaW5lc3MsIGFuZCB0aGUgbW9kcyBzaG91bGQgcmVhbGx5IHJhaXNlIHRoZWlyIGRvbmdlcnMuXCIsXHJcblx0XCJnb29nbGVhZG1pblwiIDogXCJIZWxsbyBldmVyeW9uZSwgdGhpcyBpcyB0aGUgR29vZ2xlIEFkbWluIGhlcmUgdG8gcmVtaW5kIHlvdSBhbGwgdGhhdCB3aGlsZSB3ZSBsb3ZlIHRoZSBjaGF0IGV4cGVyaWVuY2UsIHBsZWFzZSByZWZyYWluIGZyb20gY29weSBwYXN0aW5nIGluIHRoZSBjaGF0LiBUaGlzIHJ1aW5zIHRoZSBhdG1vc3BoZXJlIGFuZCBtYWtlcyBldmVyeWJvZHnigJlzIGNoYXQgZXhwZXJpZW5jZSB3b3JzZSBvdmVyYWxsLiBUaGFuayB5b3UgYW5kIHJlbWVtYmVyIHRvIGxpbmsgeW91ciBUd2l0Y2ggYW5kIEdvb2dsZSsgYWNjb3VudCB0b2RheSFcIixcclxuXHRcImJhZHN0YWRpdW1yZXF1ZXN0XCIgOiBcIldvdyAwLzEwIHRvIHRoZSBndXkgd2hvIHRob3VnaHQgb2YgdGhpcyByZXF1ZXN0LCBBUFBMQVVTRSBDTEFQIENMQVAgTEFEWSBHQUdBIEFQUExBVVNFIEFQUExBVVNFIEFQUExBVVNFXCIsXHJcbn07XHJcblxyXG4vL1N0YXJib2x0X29tZWdhIEtaaGVsZ2hhc3QiLCIvLyBjaGF0L3VzZXJsaXN0LmpzXHJcbi8vIFRoZSBsaXN0IG9mIHVzZXJzIHdobyB3aWxsIGFwcGVhciBpbiBjaGF0LCB3aXRoIGluZm8gYXNzb2NpYXRlZCB3aXRoIHRoZW0uXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFtcclxueyBjb2xvcjogXCIjMDAwMDAwXCIsIG5hbWU6IFwiUGFya1Zpc2l0b3JcIixcdFx0XHRwbGF5ZXI6IHRydWUsIH0sXHJcblxyXG57IGNvbG9yOiBcIiMwMEZGMDBcIiwgbmFtZTogXCJUdXN0aW4yMTIxXCIsIFx0XHRcdGNvbnRyaWJ1dG9yOiB0cnVlLCB9LFxyXG5cclxueyBjb2xvcjogXCIjRkYwMDAwXCIsIG5hbWU6IFwiRmFpdGhmdWxmb3JjZVwiLCBcdFx0XHRjaGF0bGVhZGVyOiB0cnVlLCBwb3N0bXNnOiBcIkJsb29kVHJhaWxcIiwgfSxcclxueyBjb2xvcjogXCIjRkYwMDAwXCIsIG5hbWU6IFwiWjMzazMzXCIsXHRcdFx0XHRcdGNoYXRsZWFkZXI6IHRydWUsIHByZW1zZzogXCJEQlN0eWxlXCIsIH0sXHJcblxyXG5cclxuXHJcbl07XHJcblxyXG4iLCIvLyBnYW1lc3RhdGUuanNcclxuLy8gXHJcblxyXG52YXIgZ2FtZVN0YXRlID1cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Ly8gTWFwIFRyYW5zaXRpb25cclxuXHRtYXBUcmFuc2l0aW9uIDoge1xyXG5cdFx0bmV4dE1hcCA6IFwiaUNodXJjaE9mSGVsaXhcIixcclxuXHRcdHdhcnA6IDAsXHJcblx0XHRhbmltT3ZlcnJpZGU6IDAsXHJcblx0fSxcclxuXHRcclxuXHRwbGF5ZXJTcHJpdGUgOiBcInlvdW5nc3RlcltoZ192ZXJ0bWl4LTMyXS5wbmdcIixcclxufTsiLCIvLyBnbG9iYWxzLmpzXHJcblxyXG53aW5kb3cuU291bmRNYW5hZ2VyID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvc291bmRtYW5hZ2VyXCIpO1xyXG53aW5kb3cuR0MgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy9nYXJiYWdlLWNvbGxlY3RvclwiKTtcclxud2luZG93LlVJID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvdWktbWFuYWdlclwiKTtcclxud2luZG93LkNoYXQgPSByZXF1aXJlKFwiLi9jaGF0L2NvcmUuanNcIik7XHJcblxyXG53aW5kb3cuY3VycmVudE1hcCA9IG51bGw7XHJcbndpbmRvdy5nYW1lU3RhdGUgPSByZXF1aXJlKFwiLi9nYW1lc3RhdGVcIik7XHJcblxyXG53aW5kb3cuREVGX1RFWFRVUkUgPSBCQVNFVVJMK1wiL2ltZy9taXNzaW5nX3RleC5wbmdcIjtcclxud2luZG93LkRFRl9TUFJJVEUgPSBCQVNFVVJMK1wiL2ltZy9taXNzaW5nX3Nwcml0ZS5wbmdcIjtcclxud2luZG93LkRFRl9TUFJJVEVfRk9STUFUID0gXCJwdF9ob3J6cm93LTMyXCI7XHJcblxyXG53aW5kb3cuQ09ORklHID0ge1xyXG5cdHNwZWVkIDoge1xyXG5cdFx0cGF0aGluZzogMC4yNSxcclxuXHRcdGFuaW1hdGlvbjogMyxcclxuXHR9LFxyXG5cdHRpbWVvdXQgOiB7XHJcblx0XHR3YWxrQ29udHJvbCA6IDEsXHJcblx0fVxyXG59O1xyXG5cclxud2luZG93LkRFQlVHID0ge307XHJcblxyXG5cclxuLy9PbiBSZWFkeVxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0d2luZG93LkRFRl9URVhUVVJFX0lNRyA9ICQoXCI8aW1nPlwiKS5hdHRyKFwic3JjXCIsIERFRl9URVhUVVJFKS5jc3Moe2Rpc3BsYXk6XCJub25lXCJ9KS5hcHBlbmRUbyhcImJvZHlcIilbMF07XHJcblx0d2luZG93LkRFRl9TUFJJVEVfSU1HID0gJChcIjxpbWc+XCIpLmF0dHIoXCJzcmNcIiwgREVGX1NQUklURSkuY3NzKHtkaXNwbGF5Olwibm9uZVwifSkuYXBwZW5kVG8oXCJib2R5XCIpWzBdO1xyXG59KTtcclxuIiwiLy8gZ2FyYmFnZS1jb2xsZWN0b3IuanNcclxuLy8gQWxsb2NhdGVzIGFsbCB0aGUgdmFyaW91cyBkaXNwb3NhYmxlIGl0ZW1zLCBzdWNoIGFzIGdlb21ldHJ5IGFuZCBsaXN0ZW5lcnMsIGZvclxyXG4vLyBsYXRlciBkaXNwb3NhbC5cclxuXHJcbnZhciBSRVZPS0VfVVJMUyA9ICEhVVJMLnJldm9rZU9iamVjdFVSTDtcclxuXHJcblxyXG5mdW5jdGlvbiBHYXJiYWdlQ29sbGVjdG9yKCkge1xyXG5cdHRoaXMuYmlucyA9IHt9O1xyXG5cdHRoaXMuYWxsb2NhdGVCaW4oXCJfZGVmYXVsdFwiKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuYWxsb2NhdGVCaW4gPSBmdW5jdGlvbihiaW5JZCkge1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdID0gbmV3IEdhcmJhZ2VCaW4oKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgYmluSWQpe1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgUHV0dGluZyBvYmplY3QgaW4gZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0YmluLmNvbGxlY3Qob2JqKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuY29sbGVjdFVSTCA9IGZ1bmN0aW9uKG9iaiwgYmluSWQpe1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgUHV0dGluZyBvYmplY3QgaW4gZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0YmluLmNvbGxlY3RVUkwob2JqKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuZ2V0QmluID0gZnVuY3Rpb24oYmluSWQpIHtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIEdldHRpbmcgZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0cmV0dXJuIGJpbjtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKGJpbklkKSB7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBDYW5ub3QgZGlzcG9zZSEgQmluSUQ6XCIsIGJpbklEKTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0XHJcblx0YmluLmRpc3Bvc2UoKTtcclxuXHRcclxuXHRiaW4gPSBudWxsO1xyXG5cdGRlbGV0ZSB0aGlzLmJpbnNbYmluSWRdO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBHYXJiYWdlQ29sbGVjdG9yKCk7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIEdhcmJhZ2VCaW4oKSB7XHJcblx0dGhpcy5kaXNwb3NhbCA9IFtdOyAvL09iamVjdHMgdGhhdCBjYW4gaGF2ZSBcImRpc3Bvc2VcIiBjYWxsZWQgb24gdGhlbVxyXG5cdHRoaXMubGlzdGVuZXJzID0gW107IC8vT2JqZWN0cyB3aXRoIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGVtXHJcblx0dGhpcy50YWdzID0gW107IC8vU2NyaXB0IHRhZ3MgYW5kIG90aGVyIGRpc3Bvc2FibGUgdGFnc1xyXG5cdFxyXG5cdHRoaXMuYmxvYnVybHMgPSBbXTsgLy9PYmplY3QgVVJMcyB0aGF0IGNhbiBiZSByZXZva2VkIHdpdGggVVJMLnJldm9rZU9iamVjdFVSTFxyXG59XHJcbkdhcmJhZ2VCaW4ucHJvdG90eXBlID0ge1xyXG5cdGNvbGxlY3Q6IGZ1bmN0aW9uKG9iaikge1xyXG5cdFx0aWYgKG9iai5kaXNwb3NlKSB7XHJcblx0XHRcdHRoaXMuZGlzcG9zYWwucHVzaChvYmopO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9iai5yZW1vdmVBbGxMaXN0ZW5lcnMpIHtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnMucHVzaChvYmopO1xyXG5cdFx0fVxyXG5cdFx0aWYgKChvYmogaW5zdGFuY2VvZiAkKSB8fCBvYmoubm9kZU5hbWUpIHtcclxuXHRcdFx0dGhpcy50YWdzLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGNvbGxlY3RVUkw6IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0aWYgKCFSRVZPS0VfVVJMUykgcmV0dXJuO1xyXG5cdFx0aWYgKHR5cGVvZiB1cmwgIT0gXCJzdHJpbmdcIikgcmV0dXJuO1xyXG5cdFx0dGhpcy5ibG9idXJscy5wdXNoKHVybCk7XHJcblx0fSxcclxuXHRcclxuXHRkaXNwb3NlOiBmdW5jdGlvbigpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXNwb3NhbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLmRpc3Bvc2FsW2ldLmRpc3Bvc2UoKTtcclxuXHRcdFx0dGhpcy5kaXNwb3NhbFtpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLmRpc3Bvc2FsID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLmxpc3RlbmVyc1tpXS5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnNbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5saXN0ZW5lcnMgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudGFncy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQkKHRoaXMudGFnc1tpXSkucmVtb3ZlQXR0cihcInNyY1wiKS5yZW1vdmUoKTtcclxuXHRcdFx0dGhpcy50YWdzW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMudGFncyA9IG51bGw7XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYmxvYnVybHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmJsb2J1cmxzW2ldKTtcclxuXHRcdFx0dGhpcy5ibG9idXJsc1tpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLmJsb2J1cmxzID0gbnVsbDtcclxuXHR9LFxyXG59O1xyXG5cclxuIiwiLy8gc291bmRtYW5hZ2VyLmpzXHJcbi8vIERlZmluZXMgdGhlIFNvdW5kIE1hbmFnZXJcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8qKlxyXG4gKi9cclxuZnVuY3Rpb24gU291bmRNYW5hZ2VyKCkge1xyXG5cdHRoaXMudGVzdFN1cHBvcnQoKTtcclxuXHRcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcIndhbGtfYnVtcFwiKTtcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcIndhbGtfanVtcFwiKTtcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcIndhbGtfanVtcF9sYW5kXCIpO1xyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwiZXhpdF93YWxrXCIpO1xyXG59XHJcbmluaGVyaXRzKFNvdW5kTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKFNvdW5kTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRzb3VuZHMgOiB7fSxcclxuXHRleHQgOiBudWxsLFxyXG5cdFxyXG5cdHRlc3RTdXBwb3J0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgdGVzdHNvdW5kID0gbmV3IEF1ZGlvKCk7XHJcblx0XHR2YXIgb2dnID0gdGVzdHNvdW5kLmNhblBsYXlUeXBlKFwiYXVkaW8vb2dnOyBjb2RlY3M9dm9yYmlzXCIpO1xyXG5cdFx0aWYgKG9nZykgdGhpcy5leHQgPSBcIi5vZ2dcIjtcclxuXHRcdGVsc2UgdGhpcy5leHQgPSBcIi5tcDNcIjtcclxuXHR9LFxyXG5cdFxyXG5cdHByZWxvYWRTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR2YXIgc25kID0gdGhpcy5zb3VuZHNbaWRdID0gbmV3IEF1ZGlvKCk7XHJcblx0XHRcdHNuZC5hdXRvcGxheSA9IGZhbHNlO1xyXG5cdFx0XHRzbmQuYXV0b2J1ZmZlciA9IHRydWU7XHJcblx0XHRcdHNuZC5wcmVsb2FkID0gXCJhdXRvXCI7XHJcblx0XHRcdHNuZC5zcmMgPSBCQVNFVVJMK1wiL3NuZC9cIiArIGlkICsgdGhpcy5leHQ7XHJcblx0XHRcdHNuZC5vbihcImVuZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c25kLmN1cnJlbnRUaW1lID0gMDtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNuZC5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zb3VuZHNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheVNvdW5kIDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdGlmICghdGhpcy5zb3VuZHNbaWRdKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJTb3VuZCBpcyBub3QgbG9hZGVkIVwiLCBpZCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuc291bmRzW2lkXS5wbGF5KCk7XHJcblx0fSxcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTb3VuZE1hbmFnZXIoKTtcclxuIiwiLy8gdWktbWFuYWdlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBVSSBtb2R1bGUsIHdoaWNoIGNvbnRyb2xzIHRoZSB1c2VyIGludGVyZmFjZS5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG52YXIgTV9XSURUSCA9IDAsIE1fSEVJR0hUID0gMSwgTV9ISURFID0gMiwgTV9UUklBTkdMRSA9IDMsIE1fVEFJTFggPSA0LCBNX1RBSUxZID0gNTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gVUlNYW5hZ2VyKCkge1xyXG5cdHRoaXMuZGlhbG9ncyA9IHtcclxuXHRcdFwidGV4dFwiIDogbmV3IERpYWxvZ0JveChcInRleHRib3hfZ29sZFwiKSxcclxuXHRcdFwiZGlhbG9nXCIgOiBuZXcgRGlhbG9nQm94KFwiZGlhbG9nX2J1YmJsZVwiKSxcclxuXHR9O1xyXG5cdFxyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHQkKGZ1bmN0aW9uKCl7XHJcblx0XHRzZWxmLl9pbml0VUlTY2VuZSgpO1xyXG5cdFx0XHJcblx0XHRzZWxmLnNrcmltID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwic2tyaW1cIikuYXBwZW5kVG8oXCIjY2FudmFzLXVpXCIpO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciB0eXBlIGluIHNlbGYuZGlhbG9ncykge1xyXG5cdFx0XHRzZWxmLmRpYWxvZ3NbdHlwZV0uZWxlbWVudCA9ICQoXCI8ZGl2PlwiKVxyXG5cdFx0XHRcdC5hZGRDbGFzcyhcImRpYWxvZ2JveFwiKS5hZGRDbGFzcyh0eXBlKVxyXG5cdFx0XHRcdC5hcHBlbmRUbyhcIiNjYW52YXMtdWlcIik7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuaW5oZXJpdHMoVUlNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoVUlNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdHNrcmltIDogbnVsbCxcclxuXHRkaWFsb2dzIDogbnVsbCxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBVSSBBY3Rpb25zIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdC8qKiBTaG93IGEgc3RhbmRhcmQgdGV4dGJveCBvbiBzY3JlZW4uICovXHJcblx0c2hvd1RleHRCb3ggOiBmdW5jdGlvbih0eXBlLCBodG1sLCBvcHRzKSB7XHJcblx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGh0bWwpICYmIG9wdHMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRvcHRzID0gaHRtbDsgaHRtbCA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdG9wdHMgPSBleHRlbmQob3B0cywge1xyXG5cdFx0XHRodG1sOiBodG1sLFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHZhciBkID0gdGhpcy5kaWFsb2dzW3R5cGVdO1xyXG5cdFx0aWYgKCFkKSB7XHJcblx0XHRcdGQgPSB0aGlzLmRpYWxvZ3NbXCJ0ZXh0XCJdO1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiSW52YWxpZCBkaWFsb2cgdHlwZTogXCIrdHlwZSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGQuc2hvdyhvcHRzKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBJbW1lZGVhdGVseSBoaWRlcyB0aGUgdGV4dCBib3ggYW5kIGNsZWFycyBhbnkgdGV4dCB0aGF0IHdhcyBpbiBpdC4gKi9cclxuXHRjbG9zZVRleHRCb3ggOiBmdW5jdGlvbih0eXBlKSB7XHJcblx0XHR2YXIgZCA9IHRoaXMuZGlhbG9nc1t0eXBlXTtcclxuXHRcdGlmICghZCkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBkaWFsb2cgdHlwZTogXCIrdHlwZSk7XHJcblx0XHRcclxuXHRcdGQuaGlkZSgpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIFNob3dzIGEgc2VsZWN0YWJsZSBtZW51IGluIHRoZSB0b3AtcmlnaHQgY29ybmVyIG9mIHRoZSBzY3JlZW4uICovXHJcblx0c2hvd01lbnUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqIEltbWVkYXRlbHkgY2xvc2VzIHRoZSBtZW51IGFuZCBjbGVhcnMgaXQgZm9yIGZ1cnRoZXIgdXNlLiAqL1xyXG5cdGNsb3NlTWVudSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogXHJcblx0ICogU2hvd3MgYSBZZXMvTm8gbWVudSBqdXN0IGFib3ZlIHRoZSB0ZXh0IGJveC4gSWYgdGV4dCBpcyBjdXJyZW50bHkgcHJpbnRpbmcgb3V0IG9uIGEsIFxyXG5cdCAqIGRpYWxvZyBib3ggb3IgdGV4dCBib3ggb24gc2NyZWVuLCB0aGlzIHdpbGwgYXV0b21hdGljYWxseSB3YWl0IGZvciB0aGUgdGV4dCB0byBmaW5pc2hcclxuXHQgKiBwcmludGluZyBiZWZvcmUgc2hvd2luZyBpdC4gVGhlIFllcyBhbmQgTm8gZnVuY3Rpb25zIHdpbGwgZmlyZSBvZmYgb25lIHdoZW4gaXMgc2VsZWN0ZWQuXHJcblx0ICogVGhlIGZ1bmN0aW9ucyB3aWxsIHByZXN1bWFibHkgcHVzaCBtb3JlIGFjdGlvbnMgaW50byB0aGUgYWN0aW9uIHF1ZXVlLlxyXG5cdCAqL1xyXG5cdHNob3dDb25maXJtUHJvbXB0IDogZnVuY3Rpb24oeWVzZm4sIG5vZm4pIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0b3BlbkluZm9kZXhQYWdlIDogZnVuY3Rpb24ocGFnZWlkKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8qKiBGYWRlIHRoZSBzY3JlZW4gb3V0IGZvciBhIHRyYW5zaXRpb24gb2Ygc29tZSBzb3J0LiAqL1xyXG5cdGZhZGVPdXQgOiBmdW5jdGlvbihkdXJhdGlvbikge1xyXG5cdFx0aWYgKCFkdXJhdGlvbikgZHVyYXRpb24gPSAxMDAwOyAvLzEgc2Vjb25kXHJcblx0fSxcclxuXHRcclxuXHQvKiogRmFkZSB0aGUgc2NyZWVuIGluIGZyb20gYSB0cmFuc2l0aW9uLiAqL1xyXG5cdGZhZGVJbiA6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XHJcblx0XHRpZiAoIWR1cmF0aW9uKSBkdXJhdGlvbiA9IDEwMDA7IC8vMSBzZWNvbmRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBEaXNwbGF5cyB0aGUgbG9hZGluZyBpY29uIG92ZXIgdGhlIG1haW4gZ2FtZSBzY3JlZW4uIE9wdGlvbmFsbHkgc3VwcGx5IHRleHQuICovXHJcblx0c2hvd0xvYWRpbmdBamF4IDogZnVuY3Rpb24obG9hZGluZ1RleHQpIHtcclxuXHRcdGlmICghbG9hZGluZ1RleHQpIGxvYWRpbmdUZXh0ID0gXCJMb2FkaW5nLi4uXCI7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEFjdGlvbiBRdWV1ZXMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGN1cnJBY3Rpb24gOiBudWxsLFxyXG5cdGFjdGlvblF1ZXVlIDogW10sXHJcblx0XHJcblx0LyoqIFBhc3MgdGhpcyBhIHNldCBvZiBmdW5jdGlvbnMgdG8gYmUgcnVuIG9uZSBhZnRlciB0aGUgb3RoZXIgd2hlbiB0aGUgdXNlciBjb25maXJtcyBcclxuXHQgKiAgYW4gYWN0aW9uLiAqL1xyXG5cdHF1ZXVlQWN0aW9uczogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR2YXIgYXJnID0gYXJndW1lbnRzW2ldO1xyXG5cdFx0XHRpZiAoJC5pc0FycmF5KGFyZykpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGFyZy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKCEkLmlzRnVuY3Rpb24oYXJnW2pdKSkgXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVJIEFjdGlvbnMgbXVzdCBiZSBmdW5jdGlvbnMgdG8gYmUgcnVuIVwiKTtcclxuXHRcdFx0XHRcdHRoaXMuYWN0aW9uUXVldWUucHVzaChhcmdbal0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICgkLmlzRnVuY3Rpb24oYXJnW2pdKSkge1xyXG5cdFx0XHRcdHRoaXMuYWN0aW9uUXVldWUucHVzaChhcmdbal0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVJIEFjdGlvbnMgbXVzdCBiZSBmdW5jdGlvbnMgdG8gYmUgcnVuIVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0LyoqIENsZWFycyBhbGwgcXVldWVkIGFjdGlvbnMgZnJvbSB0aGUgdWkgYWN0aW9uIHF1ZXVlLiBVc2UgdGhpcyBzcGFyaW5nbHkuIFRoaXMgd2lsbCBcclxuXHQgKiAgTk9UIHRlcm1pbmF0ZSBhbnkgY3VycmVudGx5IHJ1bm5pbmcgYWN0aW9ucyBvciBjbGVhciBhbnkgdGV4dCBib3hlcy4gKi9cclxuXHRjbGVhckFjdGlvblF1ZXVlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gVUkgVGhyZWUuanMgU2NlbmUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdHNjZW5lIDogbnVsbCxcclxuXHRjYW1lcmEgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0VUlTY2VuZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHRcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0dmFyIHNoID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHR2YXIgY2FtZXJhID0gdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuT3J0aG9ncmFwaGljQ2FtZXJhKDAsIHN3LCBzaCwgMCwgMSwgMTAxKTtcclxuXHRcdGNhbWVyYS5wb3NpdGlvbi5zZXQoMCwgMCwgNTEpO1xyXG5cdFx0dGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgZGxvZyBpbiB0aGlzLmRpYWxvZ3MpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJjcmVhdGVEaWFsb2dNb2RlbDogXCIsIGRsb2csIHRoaXMuZGlhbG9nc1tkbG9nXSk7IFxyXG5cdFx0XHR2YXIgbW9kZWwgPSB0aGlzLmRpYWxvZ3NbZGxvZ10uY3JlYXRlRGlhbG9nTW9kZWwoKTtcclxuXHRcdFx0dGhpcy5zY2VuZS5hZGQobW9kZWwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyB0aGlzLnRiLm1vZGVsID0gY3JlYXRlRGlhbG9nTW9kZWwoXCJ0ZXh0Ym94X2dvbGRcIik7XHJcblx0XHQvLyAvLyBhZGp1c3Qgd2lkdGggOiB0aGlzLnRiLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1swXSA9IDE7XHJcblx0XHQvLyAvLyBhZGp1c3QgaGVpZ2h0OiB0aGlzLnRiLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sxXSA9IDE7XHJcblx0XHQvLyB0aGlzLnRiLm1vZGVsLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdC8vIHRoaXMuc2NlbmUuYWRkKHRoaXMudGIubW9kZWwpO1xyXG5cdFx0XHJcblx0XHQvLyB0aGlzLmRiLm1vZGVsID0gY3JlYXRlRGlhbG9nTW9kZWwoXCJkaWFsb2dfYnViYmxlXCIpO1xyXG5cdFx0Ly8gLy8gYWRqdXN0IHdpZHRoIDogdGhpcy5kYi5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMF0gPSAxO1xyXG5cdFx0Ly8gLy8gYWRqdXN0IGhlaWdodDogdGhpcy5kYi5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gPSAxO1xyXG5cdFx0Ly8gdGhpcy5kYi5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHQvLyB0aGlzLnNjZW5lLmFkZCh0aGlzLmRiLm1vZGVsKTtcclxuXHRcdFxyXG5cdFx0Ly8gY3JlYXRlREVCVUdTZXR1cC5jYWxsKHRoaXMpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0bG9naWNMb29wIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLmN1cnJBY3Rpb24pIHtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuYWN0aW9uUXVldWUubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuY3VyckFjdGlvbiA9IHRoaXMuYWN0aW9uUXVldWUuc2hpZnQoKTtcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwidWlhY3Rpb25cIik7XHJcblx0XHRcdHRoaXMuY3VyckFjdGlvbigpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly9JZiB0aGUgYWN0aW9uIGNvbXBsZXRlZCB0aGlzIHR1cm4sIGFuZCBkaWRuJ3QgcHVzaCBpdHMgb3duIGNvbnRleHRcclxuXHRcdFx0aWYgKGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwidWlhY3Rpb25cIikgPT0gXCJ1aWFjdGlvblwiKSB7XHJcblx0XHRcdFx0Ly9DbGVhciB0aGUgY3VycmVudCBhY3Rpb25cclxuXHRcdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSBudWxsO1xyXG5cdFx0XHR9XHJcblx0XHR9IFxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBkbG9nIGluIHRoaXMuZGlhbG9ncykge1xyXG5cdFx0XHRpZiAodGhpcy5kaWFsb2dzW2Rsb2ddLmFkdmFuY2UpIHtcclxuXHRcdFx0XHRpZiAoY29udHJvbGxlci5pc0Rvd25PbmNlKFwiSW50ZXJhY3RcIiwgXCJkbG9nUHJpbnRpbmdcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMuZGlhbG9nc1tkbG9nXS5jb21wbGV0ZSgpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29udHJvbGxlci5pc0Rvd25PbmNlKFwiSW50ZXJhY3RcIiwgXCJkbG9nV2FpdGluZ1wiKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5kaWFsb2dzW2Rsb2ddLl9kaXNwbGF5TmV4dCgpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmRpYWxvZ3NbZGxvZ10uYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfY29tcGxldGVDdXJyQWN0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5hY3Rpb25RdWV1ZS5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gdGhpcy5hY3Rpb25RdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24oKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwidWlhY3Rpb25cIik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBVSU1hbmFnZXIoKTtcclxuXHJcblxyXG5mdW5jdGlvbiBEaWFsb2dCb3godHlwZSkge1xyXG5cdHRoaXMudHlwZSA9IHR5cGU7XHJcbn1cclxuZXh0ZW5kKERpYWxvZ0JveC5wcm90b3R5cGUsIHtcclxuXHRtb2RlbCA6IG51bGwsXHJcblx0ZWxlbWVudCA6IG51bGwsXHJcblx0b3duZXIgOiBudWxsLFxyXG5cdGh0bWwgOiBbXSxcclxuXHRcclxuXHRhZHZhbmNlIDogbnVsbCxcclxuXHRjb21wbGV0ZTogZnVuY3Rpb24oKXt9LFxyXG5cdF9jb21wbGV0aW9uQ2FsbGJhY2sgOiBudWxsLCAvL2NhbGxiYWNrIGZyb20gdGhlIGV2ZW50IHN0YXJ0aW5nIHRoaXMgZGlhbG9nLlxyXG5cdFxyXG5cdHNob3cgOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvLyBpZiAoIW9wdHMuaHRtbCkge1xyXG5cdFx0Ly8gXHR0aHJvdyBuZXcgRXJyb3IoXCJObyBIVE1MIGdpdmVuIHRvIHRoZSBkaWFsb2dib3gncyBzaG93KCkgbWV0aG9kIVwiKTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHRcdG93bmVyOiBudWxsLFxyXG5cdFx0XHRpc0xhc3QgOiBmYWxzZSxcclxuXHRcdH0sIG9wdHMpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm93bmVyID0gb3B0cy5vd25lcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5fY29tcGxldGlvbkNhbGxiYWNrID0gb3B0cy5jb21wbGV0ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHR5cGVvZiBvcHRzLmh0bWwgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR0aGlzLmh0bWwgPSBbb3B0cy5odG1sXTtcclxuXHRcdH0gZWxzZSBpZiAoJC5pc0FycmF5KG9wdHMuaHRtbCkpIHtcclxuXHRcdFx0dGhpcy5odG1sID0gb3B0cy5odG1sO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRpYWxvZyBnaXZlbiBpcyBvZiB0aGUgd3JvbmcgdHlwZSEgXCIsIG9wdHMuaHRtbCk7XHJcblx0XHRcdHRoaXMuaHRtbCA9IFtcIltFUlJPUjogVGhpcyBkaWFsb2cgdGV4dCBjb3VsZCBub3QgYmUgbG9hZGVkIHByb3Blcmx5IV1cIl07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuX2Rpc3BsYXkoKTtcclxuXHR9LFxyXG5cdFxyXG5cdGhpZGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5lbGVtZW50LmhpZGUoKS5jc3MoeyB3aWR0aDpcIlwiLCBoZWlnaHQ6XCJcIiwgYm90dG9tOlwiXCIsIGxlZnQ6XCJcIiwgdG9wOlwiXCIsIHJpZ2h0OlwiXCIgfSk7XHJcblx0XHR0aGlzLmh0bWwgPSBbXTtcclxuXHRcdHRoaXMuYWR2YW5jZSA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLl9jb21wbGV0aW9uQ2FsbGJhY2spXHJcblx0XHRcdHRoaXMuX2NvbXBsZXRpb25DYWxsYmFjay5jYWxsKG51bGwpO1xyXG5cdH0sXHJcblx0XHJcblx0X2Rpc3BsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gb3B0cyA9IGV4dGVuZChvcHRzLCB7XHJcblx0XHQvLyBcdGFuY2hvclk6IFwiYm90dG9tXCIsXHJcblx0XHQvLyBcdGFuY2hvclg6IFwibGVmdFwiLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHRcclxuXHRcdC8vIFN0ZXAgMTogc2l6ZSBvdXQgdGhlIHRleHRib3ggc3BhY2VcclxuXHRcdHZhciBlID0gdGhpcy5lbGVtZW50O1xyXG5cdFx0ZS5jc3MoeyB3aWR0aDpcIlwiLCBoZWlnaHQ6XCJcIiwgYm90dG9tOlwiXCIsIGxlZnQ6XCJcIiwgdG9wOlwiXCIsIHJpZ2h0OlwiXCIgfSk7IC8vcmVzZXRcclxuXHRcdFxyXG5cdFx0ZS5jc3MoeyBcInZpc2liaWxpdHlcIjogXCJoaWRkZW5cIiB9KS5zaG93KCk7IC8vTm90ZTogJC5zaG93KCkgZG9lcyBub3QgYWZmZWN0IFwidmlzaWJpbGl0eVwiXHJcblx0XHR2YXIgd2lkdGggPSAwLCBoZWlnaHQgPSAwO1xyXG5cdFx0Ly8gdmFyIHcsIGg7XHJcblx0XHRcclxuXHRcdC8vRm9yIGVhY2ggZGlhbG9nIGluIHRoZSB0ZXh0IHRvIGRpc3BsYXksIHNpemUgb3V0IHRoZSBib3ggdG8gZml0IHRoZSBsYXJnZXN0IG9uZVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmh0bWwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0ZS5odG1sKHRoaXMuaHRtbFtpXSk7XHJcblx0XHRcdHdpZHRoID0gTWF0aC5tYXgoZS5pbm5lcldpZHRoKCksIHdpZHRoKTtcclxuXHRcdFx0aGVpZ2h0ID0gTWF0aC5tYXgoZS5pbm5lckhlaWdodCgpLCBoZWlnaHQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlmeCA9IGUuaW5uZXJXaWR0aCgpIC0gZS53aWR0aCgpO1xyXG5cdFx0dmFyIGRpZnkgPSBlLmlubmVySGVpZ2h0KCkgLSBlLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDI6IHJlc2l6ZSBhbmQgcG9zaXRpb24gdGhlIHRleHRib3hlc1xyXG5cdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9XSURUSF0gPSB3aWR0aDtcclxuXHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSEVJR0hUXSA9IGhlaWdodDtcclxuXHRcdGUuY3NzKHsgd2lkdGg6IHdpZHRoLWRpZngrMiwgaGVpZ2h0OiBoZWlnaHQtZGlmeSB9KTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIGJhc2Ugb24gYW5jaG9yIHBvaW50c1xyXG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMTAsIDEwLCAwKTtcclxuXHRcdGUuY3NzKHsgYm90dG9tOiAxMCwgbGVmdDogMTAsIHRvcDogXCJcIiB9KTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIG1vdmUgaW50byBhbiBcImFkdmFuY2VcIlxyXG5cdFx0aWYgKHRoaXMub3duZXIgJiYgdGhpcy5vd25lci5nZXRUYWxraW5nQW5jaG9yKSB7XHJcblx0XHRcdC8vVE9ETyBkZXRlcm1pbmUgYW5jaG9yIHBvaW50IGJhc2VkIG9uIHdoZXJlIHRoZSBvd25lciBpcyBvbi1zY3JlZW5cclxuXHRcdFx0Ly9Qcm9qZWN0IFZlY3RvciA9IDNEIHRvIDJELCBVbnByb2plY3QgVmVjdG9yID0gMkQgdG8gM0RcclxuXHRcdFx0dmFyIGFuY2hvciA9IHRoaXMub3duZXIuZ2V0VGFsa2luZ0FuY2hvcigpO1xyXG5cdFx0XHRhbmNob3IucHJvamVjdChjdXJyZW50TWFwLmNhbWVyYSk7XHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVEFJTFhdID0gYW5jaG9yLnggLSB0aGlzLm1vZGVsLnBvc2l0aW9uLng7XHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVEFJTFldID0gYW5jaG9yLnkgLSB0aGlzLm1vZGVsLnBvc2l0aW9uLnk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDM6IHNldHVwIHR5cGV3cml0ZXIgZWZmZWN0IGFuZCBzaG93IGRpYWxvZ2JveFxyXG5cdFx0dGhpcy5fZGlzcGxheU5leHQoKTtcclxuXHRcdFxyXG5cdFx0ZS5jc3MoeyBcInZpc2liaWxpdHlcIjogXCJcIiB9KTtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBEaWFsb2cgaXMgYWxyZWFkeSBzaG93aW5nIGFuZCBzaXplZCwgc2hvdyBuZXh0IGRpYWxvZywgb3IgY2xvc2UuICovXHJcblx0X2Rpc3BsYXlOZXh0IDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5odG1sICYmIHRoaXMuaHRtbC5sZW5ndGgpIHtcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiZGxvZ1ByaW50aW5nXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5lbGVtZW50Lmh0bWwodGhpcy5odG1sLnNoaWZ0KCkpOyAvL3B1dCBpbiBmaXJzdCBkaWFsb2dcclxuXHRcdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9UUklBTkdMRV0gPSAodGhpcy5odG1sLmxlbmd0aCk/IDE6IDA7XHJcblx0XHRcdFxyXG5cdFx0XHRzZXR1cFR5cGV3cml0ZXIodGhpcywgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImRsb2dQcmludGluZ1wiKTtcclxuXHRcdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdGNyZWF0ZURpYWxvZ01vZGVsOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBpbnM7IC8vaW5zZXRzXHJcblx0XHRzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG5cdFx0XHRjYXNlIFwiZGlhbG9nX2J1YmJsZVwiOlxyXG5cdFx0XHRcdGlucyA9IHsgLy9yZW1lbWJlciwgbWVhc3VyZWQgZnJvbSBib3R0b20gbGVmdCBjb3JuZXJcclxuXHRcdFx0XHRcdHQ6IDYsIGI6IDEwLCBoOiAxNiwgLy90b3AsIGJvdHRvbSwgaGVpZ2h0XHJcblx0XHRcdFx0XHRsOiA2LCByOiAxMCwgdzogMTYsIC8vbGVmdCwgcmlnaHQsIHdpZHRoXHJcblx0XHRcdFx0XHRhczogNCwgYXg6IDYsIGF5OiAxMCwgLy9hcnJvdyBzaXplLCB4L3kgcG9zaXRpb25cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidGV4dGJveF9nb2xkXCI6XHJcblx0XHRcdFx0aW5zID0geyBcclxuXHRcdFx0XHRcdHQ6IDcsIGI6IDEwLCBoOiAxNixcclxuXHRcdFx0XHRcdGw6IDksIHI6IDEyLCB3OiAzMixcclxuXHRcdFx0XHRcdGFzOiA0LCBheDogMjIsIGF5OiAxMCxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0e1xyXG5cdFx0XHRnZW9tLnZlcnRpY2VzID0gW1xyXG5cdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRdO1xyXG5cdFx0XHRmNChnZW9tLCAwLCAxLCA0LCA1KTsgZjQoZ2VvbSwgMSwgMiwgNSwgNik7IGY0KGdlb20sIDIsIDMsIDYsIDcpO1xyXG5cdFx0XHRmNChnZW9tLCA0LCA1LCA4LCA5KTsgZjQoZ2VvbSwgNSwgNiwgOSwxMCk7IGY0KGdlb20sIDYsIDcsMTAsMTEpO1xyXG5cdFx0XHRmNChnZW9tLCA4LCA5LDEyLDEzKTsgZjQoZ2VvbSwgOSwxMCwxMywxNCk7IGY0KGdlb20sMTAsMTEsMTQsMTUpO1xyXG5cdFx0XHRmNChnZW9tLDE2LDE3LDE4LDE5LCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHtcclxuXHRcdFx0XHRnZW9tLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKDIyLCAyMCwgMjEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKSk7XHJcblx0XHRcdFx0Ly8gZ2VvbS5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygyMiwgMjEsIDIwKSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Z2VvbS5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBdKTtcclxuXHRcdFx0XHQvLyBnZW9tLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIF0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIndpZHRoXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIrMSwgICAgIDApLCB2MyhpbnMudysxLCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIrMSwgaW5zLnQpLCB2MyhpbnMudysxLCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIrMSwgaW5zLmIpLCB2MyhpbnMudysxLCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yKzEsIGlucy5oKSwgdjMoaW5zLncrMSwgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDArMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMTYrMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoZWlnaHRcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDAgICksIHYzKGlucy5sLCAgICAgMCAgKSwgdjMoaW5zLnIsICAgICAwICApLCB2MyhpbnMudywgICAgIDAgICksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50ICApLCB2MyhpbnMubCwgaW5zLnQgICksIHYzKGlucy5yLCBpbnMudCAgKSwgdjMoaW5zLncsIGlucy50ICApLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYisxKSwgdjMoaW5zLmwsIGlucy5iKzEpLCB2MyhpbnMuciwgaW5zLmIrMSksIHYzKGlucy53LCBpbnMuYisxKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKzEpLCB2MyhpbnMubCwgaW5zLmgrMSksIHYzKGlucy5yLCBpbnMuaCsxKSwgdjMoaW5zLncsIGlucy5oKzEpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCAoaW5zLmgrMSkvMiwgLTEpLCB2MygxNiwgKGlucy5oKzEpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoaWRlU3RvcFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLC0xKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywtMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywtMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsLTEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwidHJpYW5nbGVcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCAgICAgICAsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXggICAgICAgLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRhaWxYXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yLCBpbnMuYiksIHYzKGlucy53LCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oLzIsIC0xKSwgdjMoMTYsIGlucy5oLzIsIC0xKSwgdjMoMSwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ0YWlsWVwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDEsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChbXHJcblx0XHRcdChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHRcdFx0XHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0XHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0XHRmdW5jdGlvbiBmKCl7XHJcblx0XHRcdFx0XHR0ZXguaW1hZ2UgPSBpbWc7XHJcblx0XHRcdFx0XHR0ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGltZy5zcmMgPSBCQVNFVVJMK1wiL2ltZy91aS9cIitzZWxmLnR5cGUrXCIucG5nXCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWF0Lm1hcCA9IHRleDtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXQudHJhbnNwYXJlbnQgPSB0cnVlO1xyXG5cdFx0XHRcdG1hdC5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdFx0XHRcdHJldHVybiBtYXQ7XHJcblx0XHRcdH0pKCksXHJcblx0XHRcdFxyXG5cdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRcdGNvbG9yOiAweDAwMDAwMCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRyZXR1cm4gbWF0O1xyXG5cdFx0XHR9KSgpLFxyXG5cdFx0XSk7XHJcblx0XHRcclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRyZXR1cm4gdGhpcy5tb2RlbDtcclxuXHRcdFxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS8vXHJcblx0XHRmdW5jdGlvbiB2Mih4LCB5KSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMih4LCB5KTsgfVxyXG5cdFx0ZnVuY3Rpb24gdjMoeCwgeSwgeikgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgeiB8fCAwKTsgfVxyXG5cdFx0ZnVuY3Rpb24gdXYodikge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIodi54IC8gaW5zLncsIHYueSAvIGlucy5oKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gZjQoZywgYSwgYiwgYywgZCwgbWF0aSkge1xyXG5cdFx0XHRnLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKGEsIGIsIGQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBtYXRpKSk7XHJcblx0XHRcdGcuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoYSwgZCwgYywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIG1hdGkpKTtcclxuXHRcdFx0XHJcblx0XHRcdGcuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoZy52ZXJ0aWNlc1thXSksIHV2KGcudmVydGljZXNbYl0pLCB1dihnLnZlcnRpY2VzW2RdKSBdKTtcclxuXHRcdFx0Zy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1dihnLnZlcnRpY2VzW2FdKSwgdXYoZy52ZXJ0aWNlc1tkXSksIHV2KGcudmVydGljZXNbY10pIF0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxufSk7XHJcblxyXG5cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gc2V0dXBUeXBld3JpdGVyKHRleHRib3gsIGNhbGxiYWNrKSB7XHJcblx0dGV4dGJveC5hZHZhbmNlID0gbnVsbDtcclxuXHRmdW5jdGlvbiBzZXROZXh0KGNiKSB7XHJcblx0XHR0ZXh0Ym94LmFkdmFuY2UgPSBjYjtcclxuXHR9XHJcblx0XHJcblx0dmFyIGNvbXBsZXRlZFRleHQgPSB0ZXh0Ym94LmVsZW1lbnQuaHRtbCgpO1xyXG5cdHRleHRib3guY29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRleHRib3guZWxlbWVudC5odG1sKGNvbXBsZXRlZFRleHQpO1xyXG5cdFx0dGV4dGJveC5hZHZhbmNlID0gYmxpbmtDdXJzb3I7XHJcblx0XHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XHJcblx0fTtcclxuXHRcclxuXHR0ZXh0Ym94Lm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX0hJREVdID0gMTtcclxuXHRcclxuXHQvL0JlY2F1c2UgdGV4dG5vZGVzIGFyZSBub3QgXCJlbGVtZW50c1wiLCBhbmQganF1ZXJ5IHdvbid0IGhpZGUgdGV4dCBub2RlcywgaW4gXHJcblx0Ly8gb3JkZXIgdG8gaGlkZSBldmVyeXRoaW5nLCB3ZSBuZWVkIHRvIHdyYXAgZXZlcnl0aGluZyBpbiBzcGFuIHRhZ3MuLi5cclxuXHR0ZXh0Ym94LmVsZW1lbnQuY29udGVudHMoKVxyXG5cdFx0LmZpbHRlcihmdW5jdGlvbigpeyByZXR1cm4gdGhpcy5ub2RlVHlwZSA9PSAzOyB9KVxyXG5cdFx0LndyYXAoXCI8c3Bhbj5cIik7XHJcblx0XHJcblx0dmFyIGVsZW1lbnRzID0gdGV4dGJveC5lbGVtZW50LmNvbnRlbnRzKCk7XHJcblx0JChlbGVtZW50cykuaGlkZSgpO1xyXG5cdFxyXG5cdFxyXG5cdC8vQ29waWVkIGFuZCBtb2RpZmllZCBmcm9tIGh0dHA6Ly9qc2ZpZGRsZS5uZXQveTlQSmcvMjQvXHJcblx0dmFyIGkgPSAwO1xyXG5cdGZ1bmN0aW9uIGl0ZXJhdGUoKSB7XHJcblx0XHRpZiAoaSA8IGVsZW1lbnRzLmxlbmd0aCkge1xyXG5cdFx0XHQkKGVsZW1lbnRzW2ldKS5zaG93KCk7XHJcblx0XHRcdGFuaW1hdGVOb2RlKGVsZW1lbnRzW2ldLCBpdGVyYXRlKTsgXHJcblx0XHRcdGkrKztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcclxuXHRcdFx0dGV4dGJveC5hZHZhbmNlID0gYmxpbmtDdXJzb3I7XHJcblx0XHR9XHJcblx0fVxyXG5cdHRleHRib3guYWR2YW5jZSA9IGl0ZXJhdGU7XHJcblx0XHJcblx0ZnVuY3Rpb24gYW5pbWF0ZU5vZGUoZWxlbWVudCwgY2FsbGJhY2spIHtcclxuXHRcdHZhciBwaWVjZXMgPSBbXTtcclxuXHRcdGlmIChlbGVtZW50Lm5vZGVUeXBlPT0xKSB7IC8vZWxlbWVudCBub2RlXHJcblx0XHRcdHdoaWxlIChlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xyXG5cdFx0XHRcdHBpZWNlcy5wdXNoKCBlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuZmlyc3RDaGlsZCkgKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2V0TmV4dChmdW5jdGlvbiBjaGlsZFN0ZXAoKSB7XHJcblx0XHRcdFx0aWYgKHBpZWNlcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdGFuaW1hdGVOb2RlKHBpZWNlc1swXSwgY2hpbGRTdGVwKTsgXHJcblx0XHRcdFx0XHRlbGVtZW50LmFwcGVuZENoaWxkKHBpZWNlcy5zaGlmdCgpKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHJcblx0XHR9IGVsc2UgaWYgKGVsZW1lbnQubm9kZVR5cGU9PTMpIHsgLy90ZXh0IG5vZGVcclxuXHRcdFx0cGllY2VzID0gZWxlbWVudC5kYXRhLm1hdGNoKC8uezAsMn0vZyk7IC8vIDI6IE51bWJlciBvZiBjaGFycyBwZXIgZnJhbWVcclxuXHRcdFx0ZWxlbWVudC5kYXRhID0gXCJcIjtcclxuXHRcdFx0KGZ1bmN0aW9uIGFkZFRleHQoKXtcclxuXHRcdFx0XHRlbGVtZW50LmRhdGEgKz0gcGllY2VzLnNoaWZ0KCk7XHJcblx0XHRcdFx0c2V0TmV4dChwaWVjZXMubGVuZ3RoID8gYWRkVGV4dCA6IGNhbGxiYWNrKTtcclxuXHRcdFx0fSkoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0dmFyIHRpY2sgPSAwO1xyXG5cdGZ1bmN0aW9uIGJsaW5rQ3Vyc29yKGRlbHRhKSB7XHJcblx0XHR0aWNrIC09IGRlbHRhO1xyXG5cdFx0aWYgKHRpY2sgPD0gMCkge1xyXG5cdFx0XHR0aWNrID0gNTtcclxuXHRcdFx0dGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXSA9ICF0ZXh0Ym94Lm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX0hJREVdO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlREVCVUdTZXR1cCgpIHtcclxuXHR0aGlzLl9tYWluQ2FtZXJhID0gdGhpcy5jYW1lcmE7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEgPSB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgXHJcblx0XHQkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKS8gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpLFxyXG5cdFx0MC4xLCAxMDAwMCk7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEucG9zaXRpb24ueiA9IDEwO1xyXG5cdHRoaXMuc2NlbmUuYWRkKHRoaXMuX2RlYnVnQ2FtZXJhKTtcclxuXHRcclxuXHRcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQ2FtZXJhSGVscGVyKHRoaXMuX21haW5DYW1lcmEpKTtcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQXhpc0hlbHBlcig1KSk7XHJcblx0XHJcblx0dmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5fZGVidWdDYW1lcmEpO1xyXG5cdGNvbnRyb2xzLmRhbXBpbmcgPSAwLjI7XHJcblx0XHJcblx0dmFyIG9sZGxvZ2ljID0gdGhpcy5sb2dpY0xvb3A7XHJcblx0dGhpcy5sb2dpY0xvb3AgPSBmdW5jdGlvbihkZWx0YSl7XHJcblx0XHRjb250cm9scy51cGRhdGUoKTtcclxuXHRcdG9sZGxvZ2ljLmNhbGwodGhpcywgZGVsdGEpO1xyXG5cdH07XHJcbn1cclxuIiwiLy8gbWFwLmpzXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgbmRhcnJheSA9IHJlcXVpcmUoXCJuZGFycmF5XCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgUGxheWVyQ2hhciA9IHJlcXVpcmUoXCJ0cHAtcGNcIik7XHJcblxyXG52YXIgT2JqTG9hZGVyID0gcmVxdWlyZShcIi4vbW9kZWwvb2JqLWxvYWRlclwiKTtcclxuXHJcbnZhciBtU2V0dXAgPSByZXF1aXJlKFwiLi9tb2RlbC9tYXAtc2V0dXBcIik7XHJcblxyXG5cclxuLy8gVGhlc2Ugd291bGQgYmUgQ09OU1RzIGlmIHdlIHdlcmVuJ3QgaW4gdGhlIGJyb3dzZXJcclxudmFyIEVYVF9NQVBCVU5ETEUgPSBcIi56aXBcIjsgLy9FeHRlbnNpb24gZm9yIHJlcXVlc3RpbmcgbWFwIGJ1bmRsZXNcclxudmFyIERFRl9IRUlHSFRfU1RFUCA9IDAuNTsgLy9EZWZhdWx0IFkgdHJhbnNsYXRpb24gYW1vdW50IGEgaGVpZ2h0IHN0ZXAgdGFrZXMuIFRoaXMgY2FuIGJlIGRlZmluZWQgaW4gYSBtYXAgZmlsZS5cclxudmFyIEdDX0JJTiA9IFwibWFwXCI7XHJcblxyXG5cclxuLy8gSWYgeW91IG1ha2UgYW55IGNoYW5nZXMgaGVyZSwgbWFrZSBzdXJlIHRvIG1pcnJvciB0aGVtIGluIGJ1aWxkL21hcC16aXBwZXIuanMhXHJcbmZ1bmN0aW9uIGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHZhbCkge1xyXG5cdC8vIFRpbGVEYXRhOiBNTU1NTFcwMCBUVFRISEhISFxyXG5cdC8vIFdoZXJlOlxyXG5cdC8vICAgIE0gPSBNb3ZlbWVudCwgQml0cyBhcmU6IChEb3duLCBVcCwgTGVmdCwgUmlnaHQpXHJcblx0Ly8gICAgTCA9IExlZGdlIGJpdCAodGhpcyB0aWxlIGlzIGEgbGVkZ2U6IHlvdSBqdW1wIG92ZXIgaXQgd2hlbiBnaXZlbiBwZXJtaXNzaW9uIHRvIGVudGVyIGl0KVxyXG5cdC8vICAgIFcgPSBXYXRlciBiaXQgKHRoaXMgdGlsZSBpcyB3YXRlcjogbW9zdCBhY3RvcnMgYXJlIGRlbmllZCBlbnRyeSBvbnRvIHRoaXMgdGlsZSlcclxuXHQvLyAgICBIID0gSGVpZ2h0ICh2ZXJ0aWNhbCBsb2NhdGlvbiBvZiB0aGUgY2VudGVyIG9mIHRoaXMgdGlsZSlcclxuXHQvLyAgICBUID0gVHJhbnNpdGlvbiBUaWxlICh0cmFuc2l0aW9uIHRvIGFub3RoZXIgTGF5ZXIgd2hlbiBzdGVwcGluZyBvbiB0aGlzIHRpbGUpXHJcblx0dmFyIHByb3BzID0ge307XHJcblx0XHJcblx0dmFyIG1vdmVtZW50ID0gKCh2YWwgPj4gMTIpICYgMHhGKTtcclxuXHQvLyBtb3ZlbWVudCBpcyBibG9ja2VkIGlmIGEgbW92ZW1lbnQgZmxhZyBpcyB0cnVlOlxyXG5cdHByb3BzLm1vdmVtZW50ID0ge307XHJcblx0cHJvcHMubW92ZW1lbnRbXCJkb3duXCJdICA9ICEhKG1vdmVtZW50ICYgMHg4KTtcclxuXHRwcm9wcy5tb3ZlbWVudFtcInVwXCJdICAgID0gISEobW92ZW1lbnQgJiAweDQpO1xyXG5cdHByb3BzLm1vdmVtZW50W1wibGVmdFwiXSAgPSAhIShtb3ZlbWVudCAmIDB4Mik7XHJcblx0cHJvcHMubW92ZW1lbnRbXCJyaWdodFwiXSA9ICEhKG1vdmVtZW50ICYgMHgxKTtcclxuXHRcclxuXHRwcm9wcy5pc1dhbGthYmxlID0gISEofm1vdmVtZW50ICYgMHhGKTtcclxuXHRwcm9wcy5pc0xlZGdlID0gISEodmFsICYgKDB4MSA8PCAxMSkpO1xyXG5cdHByb3BzLmlzV2F0ZXIgPSAhISh2YWwgJiAoMHgxIDw8IDEwKSk7XHJcblx0XHJcblx0cHJvcHMudHJhbnNpdGlvbiA9ICgodmFsID4+IDUpICYgMHg3KTtcclxuXHRcclxuXHRwcm9wcy5oZWlnaHQgPSAoKHZhbCkgJiAweDFGKTtcclxuXHRcclxuXHRwcm9wcy5ub05QQyA9ICEhKHZhbCAmICgweDEgPDwgOSkpO1xyXG5cdFxyXG5cdHJldHVybiBwcm9wcztcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICpcclxuICpcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIE1hcChpZCwgb3B0cyl7XHJcblx0dGhpcy5pZCA9IGlkO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHRHQy5hbGxvY2F0ZUJpbihHQ19CSU4pO1xyXG5cdHRoaXMuZ2MgPSBHQy5nZXRCaW4oR0NfQklOKTtcclxuXHRcclxuXHR0aGlzLmZpbGVTeXMgPSBuZXcgemlwLmZzLkZTKCk7XHJcbn1cclxuaW5oZXJpdHMoTWFwLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoTWFwLnByb3RvdHlwZSwge1xyXG5cdGlkIDogbnVsbCwgLy9tYXAncyBpbnRlcm5hbCBpZFxyXG5cdFxyXG5cdGZpbGU6IG51bGwsIC8vWmlwIGZpbGUgaG9sZGluZyBhbGwgZGF0YVxyXG5cdGZpbGVTeXM6IG51bGwsIC8vQ3VycmVudCB6aXAgZmlsZSBzeXN0ZW0gZm9yIHRoaXMgbWFwXHJcblx0eGhyOiBudWxsLCAvL2FjdGl2ZSB4aHIgcmVxdWVzdFxyXG5cdFxyXG5cdG1ldGFkYXRhIDogbnVsbCxcclxuXHRvYmpkYXRhIDogbnVsbCxcclxuXHRtdGxkYXRhIDogbnVsbCxcclxuXHRcclxuXHRsU2NyaXB0VGFnIDogbnVsbCxcclxuXHRnU2NyaXB0VGFnIDogbnVsbCxcclxuXHRcclxuXHRjYW1lcmE6IG51bGwsXHJcblx0Y2FtZXJhczogbnVsbCxcclxuXHRzY2VuZTogbnVsbCxcclxuXHRtYXBtb2RlbDogbnVsbCxcclxuXHRcclxuXHRzcHJpdGVOb2RlOiBudWxsLFxyXG5cdGxpZ2h0Tm9kZTogbnVsbCxcclxuXHRjYW1lcmFOb2RlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvYWQgTWFuYWdlbWVudCBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRkaXNwb3NlIDogZnVuY3Rpb24oKXtcclxuXHRcdCQodGhpcy5sU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdCQodGhpcy5nU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMuZmlsZTtcclxuXHRcdGRlbGV0ZSB0aGlzLmZpbGVTeXM7XHJcblx0XHRkZWxldGUgdGhpcy54aHI7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLm1ldGFkYXRhO1xyXG5cdFx0ZGVsZXRlIHRoaXMub2JqZGF0YTtcclxuXHRcdGRlbGV0ZSB0aGlzLm10bGRhdGE7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLmxTY3JpcHRUYWc7XHJcblx0XHRkZWxldGUgdGhpcy5nU2NyaXB0VGFnO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy50aWxlZGF0YTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMuc2NlbmU7XHJcblx0XHRkZWxldGUgdGhpcy5tYXBtb2RlbDtcclxuXHRcdGRlbGV0ZSB0aGlzLmNhbWVyYTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMuc3ByaXRlTm9kZTtcclxuXHRcdGRlbGV0ZSB0aGlzLmxpZ2h0Tm9kZTtcclxuXHRcdGRlbGV0ZSB0aGlzLmNhbWVyYU5vZGU7XHJcblx0XHRcclxuXHRcdEdDLmRpc3Bvc2UoR0NfQklOKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBCZWdpbiBkb3dubG9hZCBvZiB0aGlzIG1hcCdzIHppcCBmaWxlLCBwcmVsb2FkaW5nIHRoZSBkYXRhLiAqL1xyXG5cdGRvd25sb2FkIDogZnVuY3Rpb24oKXtcclxuXHRcdGlmICh0aGlzLmZpbGUpIHJldHVybjsgLy93ZSBoYXZlIHRoZSBmaWxlIGluIG1lbW9yeSBhbHJlYWR5LCBkbyBub3RoaW5nXHJcblx0XHRpZiAodGhpcy54aHIpIHJldHVybjsgLy9hbHJlYWR5IGdvdCBhbiBhY3RpdmUgcmVxdWVzdCwgZG8gbm90aGluZ1xyXG5cdFx0XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgeGhyID0gdGhpcy54aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdHhoci5vcGVuKFwiR0VUXCIsIEJBU0VVUkwrXCIvbWFwcy9cIit0aGlzLmlkK0VYVF9NQVBCVU5ETEUpO1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJYSFI6IFwiLCB4aHIpO1xyXG5cdFx0eGhyLnJlc3BvbnNlVHlwZSA9IFwiYmxvYlwiO1xyXG5cdFx0eGhyLm9uKFwibG9hZFwiLCBmdW5jdGlvbihlKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiTE9BRDpcIiwgZSk7XHJcblx0XHRcdHNlbGYuZmlsZSA9IHhoci5yZXNwb25zZTtcclxuXHRcdFx0c2VsZi5lbWl0KFwiZG93bmxvYWRlZFwiKTtcclxuXHRcdH0pO1xyXG5cdFx0eGhyLm9uKFwicHJvZ3Jlc3NcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiUFJPR1JFU1M6XCIsIGUpO1xyXG5cdFx0XHRpZiAoZS5sZW5ndGhDb21wdXRhYmxlKSB7XHJcblx0XHRcdFx0dmFyIHBlcmNlbnREb25lID0gZS5sb2FkZWQgLyBlLnRvdGFsO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vbWFycXVlZSBiYXJcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJlcnJvclwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SOlwiLCBlKTtcclxuXHRcdH0pO1xyXG5cdFx0eGhyLm9uKFwiY2FuY2VsZWRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJDQU5DRUxFRDpcIiwgZSk7XHJcblx0XHR9KTtcclxuXHRcdC8vVE9ETyBvbiBlcnJvciBhbmQgb24gY2FuY2VsZWRcclxuXHRcdFxyXG5cdFx0eGhyLnNlbmQoKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqICBSZWFkcyB0aGUgdGlsZSBkYXRhIGFuZCBiZWdpbnMgbG9hZGluZyB0aGUgcmVxdWlyZWQgcmVzb3VyY2VzLlxyXG5cdCAqL1xyXG5cdGxvYWQgOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0aWYgKCF0aGlzLmZpbGUpIHsgLy9JZiBmaWxlIGlzbid0IGRvd25sb2FkZWQgeWV0LCBkZWZlciBsb2FkaW5nXHJcblx0XHRcdHRoaXMub25jZShcImRvd25sb2FkZWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRzZWxmLmxvYWQoKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuZG93bmxvYWQoKTtcclxuXHRcdFx0Ly9UT0RPIHRocm93IHVwIGxvYWRpbmcgZ2lmXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5tYXJrTG9hZGluZyhcIk1BUF9tYXBkYXRhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZpbGVTeXMuaW1wb3J0QmxvYih0aGlzLmZpbGUsIGZ1bmN0aW9uIHN1Y2Nlc3MoKXtcclxuXHRcdFx0Ly9sb2FkIHVwIHRoZSBtYXAhXHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLmpzb25cIikuZ2V0VGV4dChfX2pzb25Mb2FkZWQsIF9fbG9nUHJvZ3Jlc3MpO1xyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5vYmpcIikuZ2V0VGV4dChfX29iakxvYWRlZCwgX19sb2dQcm9ncmVzcyk7XHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLm10bFwiKS5nZXRUZXh0KF9fbXRsTG9hZGVkLCBfX2xvZ1Byb2dyZXNzKTtcclxuXHRcdFx0XHJcblx0XHR9LCBmdW5jdGlvbiBlcnJvcihlKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJFUlJPUjogXCIsIGUpO1xyXG5cdFx0XHRzZWxmLmVtaXQoXCJsb2FkLWVycm9yXCIpOyAvL1NlbmQgdG8gdGhlIGRvcml0byBkdW5nZW9uXHJcblx0XHR9KTtcclxuXHRcdHJldHVybjsgXHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9nUHJvZ3Jlc3MoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiUFJPR1JFU1NcIiwgYXJndW1lbnRzKTtcclxuXHRcdH1cclxuXHRcdC8vQ2FsbGJhY2sgY2hhaW4gYmVsb3dcclxuXHRcdGZ1bmN0aW9uIF9fanNvbkxvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYubWV0YWRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi50aWxlZGF0YSA9IG5kYXJyYXkoc2VsZi5tZXRhZGF0YS5tYXAsIFtzZWxmLm1ldGFkYXRhLndpZHRoLCBzZWxmLm1ldGFkYXRhLmhlaWdodF0sIFsxLCBzZWxmLm1ldGFkYXRhLndpZHRoXSk7XHJcblx0XHRcdGlmIChzZWxmLm1ldGFkYXRhW1wiaGVpZ2h0c3RlcFwiXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c2VsZi5tZXRhZGF0YVtcImhlaWdodHN0ZXBcIl0gPSBERUZfSEVJR0hUX1NURVA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuZW1pdChcImxvYWRlZC1tZXRhXCIpO1xyXG5cdFx0XHRfX2xvYWREb25lKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fb2JqTG9hZGVkKGRhdGEpIHtcclxuXHRcdFx0c2VsZi5vYmpkYXRhID0gZGF0YTtcclxuXHRcdFx0X19tb2RlbExvYWRlZCgpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19tdGxMb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm10bGRhdGEgPSBkYXRhO1xyXG5cdFx0XHRfX21vZGVsTG9hZGVkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX21vZGVsTG9hZGVkKCkge1xyXG5cdFx0XHRpZiAoIXNlbGYub2JqZGF0YSB8fCAhc2VsZi5tdGxkYXRhKSByZXR1cm47IC8vZG9uJ3QgYmVnaW4gcGFyc2luZyB1bnRpbCB0aGV5J3JlIGJvdGggbG9hZGVkXHJcblx0XHRcdFxyXG5cdFx0XHRmdW5jdGlvbiBsb2FkVGV4dHVyZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkxPQUQgVEVYOlwiLCBmaWxlbmFtZSk7XHJcblx0XHRcdFx0dmFyIGZpbGUgPSBzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShmaWxlbmFtZSk7XHJcblx0XHRcdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBURVhUVVJFOiBObyBzdWNoIGZpbGUgaW4gbWFwIGJ1bmRsZSEgXCIrZmlsZW5hbWUpO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2soREVGX1RFWFRVUkUpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmaWxlLmdldEJsb2IoXCJpbWFnZS9wbmdcIiwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJURVggTE9BREVEOlwiLCBmaWxlbmFtZSwgZGF0YSk7XHJcblx0XHRcdFx0XHR2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRcdEdDLmNvbGxlY3RVUkwodXJsLCBHQ19CSU4pO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2sodXJsKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG9iamxkciA9IG5ldyBPYmpMb2FkZXIoc2VsZi5vYmpkYXRhLCBzZWxmLm10bGRhdGEsIGxvYWRUZXh0dXJlLCB7XHJcblx0XHRcdFx0Z2M6IEdDX0JJTixcclxuXHRcdFx0fSk7XHJcblx0XHRcdG9iamxkci5vbihcImxvYWRcIiwgX19tb2RlbFJlYWR5KTtcclxuXHRcdFx0b2JqbGRyLmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19tb2RlbFJlYWR5KG9iaikge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIl9fbW9kZWxSZWFkeVwiKTtcclxuXHRcdFx0c2VsZi5tYXBtb2RlbCA9IG9iajtcclxuXHRcdFx0Ly8gX190ZXN0X19vdXRwdXRUcmVlKG9iaik7XHJcblx0XHRcdHNlbGYub2JqZGF0YSA9IHNlbGYubXRsZGF0YSA9IHRydWU7IC8vd2lwZSB0aGUgYmlnIHN0cmluZ3MgZnJvbSBtZW1vcnlcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZGVkLW1vZGVsXCIpO1xyXG5cdFx0XHRfX2xvYWREb25lKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZERvbmUoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiX19sb2FkRG9uZVwiLCAhIXNlbGYubWFwbW9kZWwsICEhc2VsZi50aWxlZGF0YSk7XHJcblx0XHRcdGlmICghc2VsZi5tYXBtb2RlbCB8fCAhc2VsZi50aWxlZGF0YSkgcmV0dXJuOyAvL2Rvbid0IGNhbGwgb24gX2luaXQgYmVmb3JlIGJvdGggYXJlIGxvYWRlZFxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5faW5pdCgpO1xyXG5cdFx0XHRzZWxmLm1hcmtMb2FkRmluaXNoZWQoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgdGhlIG1hcCBmb3IgZGlzcGxheSBmcm9tIHRoZSBzdG9yZWQgZGF0YS5cclxuXHQgKi9cclxuXHRfaW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHR0aGlzLmNhbWVyYXMgPSB7fTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLm1hcG1vZGVsKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5jYW1lcmFMb2dpY3MgPSBbXTtcclxuXHRcdG1TZXR1cC5zZXR1cFJpZ2dpbmcuY2FsbCh0aGlzKTtcclxuXHRcdC8vIE1hcCBNb2RlbCBpcyBub3cgcmVhZHlcclxuXHRcdFxyXG5cdFx0dGhpcy5faW5pdEV2ZW50TWFwKCk7XHJcblx0XHRcclxuXHRcdHRoaXMuZW1pdChcIm1hcC1yZWFkeVwiKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gVGlsZSBJbmZvcm1hdGlvbiBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHR0aWxlZGF0YSA6IG51bGwsXHJcblx0XHJcblx0Z2V0VGlsZURhdGEgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgdGlsZSA9IGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHRoaXMudGlsZWRhdGEuZ2V0KHgsIHkpKTtcclxuXHRcdHJldHVybiB0aWxlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0TGF5ZXJUcmFuc2l0aW9uIDogZnVuY3Rpb24oeCwgeSwgY3VyckxheWVyKSB7XHJcblx0XHRjdXJyTGF5ZXIgPSAoY3VyckxheWVyIT09dW5kZWZpbmVkKT8gY3VyckxheWVyIDogMTtcclxuXHRcdHZhciB0aWxlID0gdGhpcy5nZXRUaWxlRGF0YSh4LCB5KTtcclxuXHRcdHZhciBsYXllciA9IHRpbGUudHJhbnNpdGlvbjtcclxuXHRcdHZhciBvcmlnaW4xID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbY3VyckxheWVyLTFdW1wiMmRcIl07XHJcblx0XHR2YXIgb3JpZ2luMiA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2xheWVyLTFdW1wiMmRcIl07XHJcblx0XHRcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGxheWVyOiBsYXllcixcclxuXHRcdFx0eDogeCAtIG9yaWdpbjFbMF0gKyBvcmlnaW4yWzBdLFxyXG5cdFx0XHR5OiB5IC0gb3JpZ2luMVsxXSArIG9yaWdpbjJbMV0sXHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0M0RUaWxlTG9jYXRpb24gOiBmdW5jdGlvbih4LCB5LCBsYXllciwgdGlsZWRhdGEpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdGxheWVyID0geC56OyB5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgfHwgMSkgLSAxO1xyXG5cdFx0aWYgKCF0aWxlZGF0YSkgdGlsZWRhdGEgPSB0aGlzLmdldFRpbGVEYXRhKHgsIHkpO1xyXG5cdFx0XHJcblx0XHR2YXIgbGF5ZXJkYXRhID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbbGF5ZXJdO1xyXG5cdFx0dmFyIHogPSB0aWxlZGF0YS5oZWlnaHQgKiB0aGlzLm1ldGFkYXRhLmhlaWdodHN0ZXA7XHJcblx0XHRcclxuXHRcdHZhciBsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB6LCB5KTtcclxuXHRcdGxvYy54IC09IGxheWVyZGF0YVtcIjJkXCJdWzBdO1xyXG5cdFx0bG9jLnogLT0gbGF5ZXJkYXRhW1wiMmRcIl1bMV07XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xyXG5cdFx0bWF0LnNldC5hcHBseShtYXQsIGxheWVyZGF0YVtcIjNkXCJdKTtcclxuXHRcdGxvYy5hcHBseU1hdHJpeDQobWF0KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIGxvYztcclxuXHR9LFxyXG5cdC8qXHJcblx0Z2V0QWxsV2Fsa2FibGVUaWxlcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHRpbGVzID0gW107XHJcblx0XHRmb3IgKHZhciBsaSA9IDE7IGxpIDw9IDc7IGxpKyspIHtcclxuXHRcdFx0aWYgKCF0aGlzLm1ldGFkYXRhLmxheWVyc1tsaS0xXSkgY29udGludWU7XHJcblx0XHRcdHRpbGVzW2xpXSA9IFtdO1xyXG5cdFx0XHRcclxuXHRcdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm1ldGFkYXRhLmhlaWdodDsgeSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm1ldGFkYXRhLndpZHRoOyB4KyspIHtcclxuXHRcdFx0XHRcdHZhciB0ZGF0YSA9IHRoaXMuZ2V0VGlsZURhdGEoeCwgeSk7XHJcblx0XHRcdFx0XHRpZiAoIXRkYXRhLmlzV2Fsa2FibGUpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0ZGF0YVtcIjNkbG9jXCJdID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsaSwgdGRhdGEpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0aWxlc1tsaV0ucHVzaCh0ZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGlsZXM7XHJcblx0fSwgKi9cclxuXHRcclxuXHRnZXRSYW5kb21OUENTcGF3blBvaW50IDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMubWV0YWRhdGEubnBjc3Bhd25zKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHJlcXVlc3RlZCBOUEMgU3Bhd24gUG9pbnQgb24gYSBtYXAgd2hlcmUgbm9uZSBhcmUgZGVmaW5lZCFcIik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBwdHMgPSB0aGlzLm1ldGFkYXRhLm5wY3NwYXducztcclxuXHRcdHZhciBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHB0cy5sZW5ndGgpO1xyXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHB0c1tpbmRleF1bMF0sIHB0c1tpbmRleF1bMV0sIHB0c1tpbmRleF1bMl0gfHwgMSk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIGNhbldhbGtCZXR3ZWVuOiBJZiBpdCBpcyBwb3NzaWJsZSB0byB3YWxrIGZyb20gb25lIHRpbGUgdG8gYW5vdGhlci4gVGhlIHR3b1xyXG5cdCAqIFx0XHR0aWxlcyBtdXN0IGJlIGFkamFjZW50LCBvciBmYWxzZSBpcyBpbW1lZGVhdGVseSByZXR1cm5lZC5cclxuXHQgKiByZXR1cm5zOlxyXG5cdCAqIFx0XHRmYWxzZSA9IGNhbm5vdCwgMSA9IGNhbiwgMiA9IG11c3QganVtcCwgNCA9IG11c3Qgc3dpbS9zdXJmXHJcblx0ICovXHJcblx0Y2FuV2Fsa0JldHdlZW4gOiBmdW5jdGlvbihzcmN4LCBzcmN5LCBkZXN0eCwgZGVzdHksIGlnbm9yZUV2ZW50cyl7XHJcblx0XHRpZiAoTWF0aC5hYnMoc3JjeCAtIGRlc3R4KSArIE1hdGguYWJzKHNyY3kgLSBkZXN0eSkgIT0gMSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHQvLyBJZiB3ZSdyZSBzb21laG93IGFscmVhZHkgb3V0c2lkZSB0aGUgbWFwLCB1bmNvbmRpdGlvbmFsbHkgYWxsb3cgdGhlbSB0byB3YWxrIGFyb3VuZCB0byBnZXQgYmFjayBpblxyXG5cdFx0aWYgKHNyY3ggPCAwIHx8IHNyY3ggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIHRydWU7XHJcblx0XHRpZiAoc3JjeSA8IDAgfHwgc3JjeSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIHRydWU7XHJcblx0XHRcclxuXHRcdC8vIFNhbml0eSBjaGVjayBlZGdlcyBvZiB0aGUgbWFwXHJcblx0XHRpZiAoZGVzdHggPCAwIHx8IGRlc3R4ID49IHRoaXMubWV0YWRhdGEud2lkdGgpIHJldHVybiBmYWxzZTtcclxuXHRcdGlmIChkZXN0eSA8IDAgfHwgZGVzdHkgPj0gdGhpcy5tZXRhZGF0YS5oZWlnaHQpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dmFyIHNyY3RpbGUgPSB0aGlzLmdldFRpbGVEYXRhKHNyY3gsIHNyY3kpO1xyXG5cdFx0dmFyIGRlc3R0aWxlID0gdGhpcy5nZXRUaWxlRGF0YShkZXN0eCwgZGVzdHkpO1xyXG5cdFx0XHJcblx0XHRpZiAoIWRlc3R0aWxlLmlzV2Fsa2FibGUpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0aWYgKCFpZ25vcmVFdmVudHMpIHsgLy9jaGVjayBmb3IgdGhlIHByZXNlbnNlIG9mIGV2ZW50c1xyXG5cdFx0XHR2YXIgZXZ0cyA9IHRoaXMuZXZlbnRNYXAuZ2V0KGRlc3R4LCBkZXN0eSk7XHJcblx0XHRcdGlmIChldnRzKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWV2dHNbaV0uY2FuV2Fsa09uKCkpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGNhbldhbGsgPSB0cnVlOyAvL0Fzc3VtZSB3ZSBjYW4gdHJhdmVsIGJldHdlZW4gdW50aWwgcHJvdmVuIG90aGVyd2lzZS5cclxuXHRcdHZhciBtdXN0SnVtcCwgbXVzdFN3aW0sIG11c3RUcmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gKGZ1bmN0aW9uKCl7XHJcblx0XHRcdHN3aXRjaCAoMSkge1xyXG5cdFx0XHRcdGNhc2UgKHNyY3kgLSBkZXN0eSk6IHJldHVybiBbXCJ1cFwiLCBcImRvd25cIl07XHJcblx0XHRcdFx0Y2FzZSAoZGVzdHkgLSBzcmN5KTogcmV0dXJuIFtcImRvd25cIiwgXCJ1cFwiXTtcclxuXHRcdFx0XHRjYXNlIChzcmN4IC0gZGVzdHgpOiByZXR1cm4gW1wibGVmdFwiLCBcInJpZ2h0XCJdO1xyXG5cdFx0XHRcdGNhc2UgKGRlc3R4IC0gc3JjeCk6IHJldHVybiBbXCJyaWdodFwiLCBcImxlZnRcIl07XHJcblx0XHRcdH0gcmV0dXJuIG51bGw7XHJcblx0XHR9KSgpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3JjdGlsZS5tb3ZlbWVudFtkaXJbMF1dKSB7IC8vaWYgbW92ZW1lbnQgPSB0cnVlLCBtZWFucyB3ZSBjYW4ndCB3YWxrIHRoZXJlXHJcblx0XHRcdGlmIChzcmN0aWxlLmlzTGVkZ2UpIFxyXG5cdFx0XHRcdG11c3RKdW1wID0gdHJ1ZTtcclxuXHRcdFx0ZWxzZSBjYW5XYWxrID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRjYW5XYWxrICY9ICFkZXN0dGlsZS5tb3ZlbWVudFtkaXJbMV1dO1xyXG5cdFx0XHJcblx0XHRtdXN0U3dpbSA9IGRlc3R0aWxlLmlzV2F0ZXI7XHJcblx0XHRcclxuXHRcdG11c3RUcmFuc2l0aW9uID0gISFkZXN0dGlsZS50cmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHRtdXN0QmVQbGF5ZXIgPSAhIWRlc3R0aWxlLm5vTlBDO1xyXG5cdFx0XHJcblx0XHRpZiAoIWNhbldhbGspIHJldHVybiBmYWxzZTtcclxuXHRcdHJldHVybiAoY2FuV2Fsaz8weDE6MCkgfCAobXVzdEp1bXA/MHgyOjApIHwgKG11c3RTd2ltPzB4NDowKSB8IChtdXN0VHJhbnNpdGlvbj8weDg6MCkgfCAobXVzdEJlUGxheWVyPzB4MTA6MCk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBFdmVudCBIYW5kbGluZyBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfbG9jYWxJZCA6IDAsXHJcblx0ZXZlbnRMaXN0IDogbnVsbCxcclxuXHRldmVudE1hcCA6IG51bGwsXHJcblx0XHJcblx0X2luaXRFdmVudE1hcCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHJcblx0XHR0aGlzLmV2ZW50TGlzdCA9IHt9O1xyXG5cdFx0dmFyIHcgPSB0aGlzLm1ldGFkYXRhLndpZHRoLCBoID0gdGhpcy5tZXRhZGF0YS5oZWlnaHQ7XHJcblx0XHR0aGlzLmV2ZW50TWFwID0gbmRhcnJheShuZXcgQXJyYXkodypoKSwgW3csIGhdLCBbMSwgd10pO1xyXG5cdFx0dGhpcy5ldmVudE1hcC5wdXQgPSBmdW5jdGlvbih4LCB5LCB2YWwpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmdldCh4LCB5KSkge1xyXG5cdFx0XHRcdHRoaXMuc2V0KHgsIHksIFtdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodGhpcy5nZXQoeCwgeSkuaW5kZXhPZih2YWwpID49IDApIHJldHVybjsgLy9kb24ndCBkb3VibGUgYWRkXHJcblx0XHRcdHRoaXMuZ2V0KHgsIHkpLnB1c2godmFsKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLmV2ZW50TWFwLnJlbW92ZSA9IGZ1bmN0aW9uKHgsIHksIHZhbCkge1xyXG5cdFx0XHRpZiAoIXRoaXMuZ2V0KHgsIHkpKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0dmFyIGkgPSB0aGlzLmdldCh4LCB5KS5pbmRleE9mKHZhbCk7XHJcblx0XHRcdGlmIChpID09IC0xKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KHgsIHkpLnNwbGljZShpLCAxKTtcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHRoaXMuc3ByaXRlTm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0dGhpcy5zcHJpdGVOb2RlLm5hbWUgPSBcIlNwcml0ZSBSaWdcIjtcclxuXHRcdHRoaXMuc3ByaXRlTm9kZS5wb3NpdGlvbi55ID0gMC4yMTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMuc3ByaXRlTm9kZSk7XHJcblx0XHRcclxuXHRcdC8vIExvYWQgZXZlbnQganMgZmlsZXMgbm93OlxyXG5cdFx0bG9hZFNjcmlwdChcImxcIik7IC8vIExvYWQgbG9jYWxseSBkZWZpbmVkIGV2ZW50c1xyXG5cdFx0bG9hZFNjcmlwdChcImdcIik7IC8vIExvYWQgZ2xvYmFsbHkgZGVmaW5lZCBldmVudHNcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIHRoZSBwbGF5ZXIgY2hhcmFjdGVyIGV2ZW50XHJcblx0XHR0aGlzLl9pbml0UGxheWVyQ2hhcmFjdGVyKCk7XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gbG9hZFNjcmlwdCh0KSB7XHJcblx0XHRcdHZhciBmaWxlID0gc2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUodCtcIl9ldnQuanNcIik7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIEVWRU5UUzogTm8gXCIrdCtcIl9ldnQuanMgZmlsZSBpcyBwcmVzZW50IGluIHRoZSBtYXAgYnVuZGxlLlwiKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0ZmlsZS5nZXRCbG9iKFwidGV4dC9qYXZhc2NyaXB0XCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdC8vIE5PVEU6IFdlIGNhbm5vdCB1c2UgSlF1ZXJ5KCkuYXBwZW5kKCksIGFzIGl0IGRlbGlicmF0ZWx5IGNsZWFucyB0aGUgc2NyaXB0IHRhZ3NcclxuXHRcdFx0XHQvLyAgIG91dCBvZiB0aGUgZG9tIGVsZW1lbnQgd2UncmUgYXBwZW5kaW5nLCBsaXRlcmFsbHkgZGVmZWF0aW5nIHRoZSBwdXJwb3NlLlxyXG5cdFx0XHRcdC8vIE5PVEUyOiBXZSBhcHBlbmQgdG8gdGhlIERPTSBpbnN0ZWFkIG9mIHVzaW5nIGV2YWwoKSBvciBuZXcgRnVuY3Rpb24oKSBiZWNhdXNlXHJcblx0XHRcdFx0Ly8gICB3aGVuIGFwcGVuZGVkIGxpa2Ugc28sIHRoZSBpbi1icm93c2VyZGVidWdnZXIgc2hvdWxkIGJlIGFibGUgdG8gZmluZCBpdCBhbmRcclxuXHRcdFx0XHQvLyAgIGJyZWFrcG9pbnQgaW4gaXQuXHJcblx0XHRcdFx0dmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XHJcblx0XHRcdFx0c2NyaXB0LnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiO1xyXG5cdFx0XHRcdHNjcmlwdC5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEpO1xyXG5cdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcclxuXHRcdFx0XHRzZWxmW3QrXCJTY3JpcHRUYWdcIl0gPSBzY3JpcHQ7XHJcblx0XHRcdFx0Ly8gVXBvbiBiZWluZyBhZGRlZCB0byB0aGUgYm9keSwgaXQgaXMgZXZhbHVhdGVkXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0R0MuY29sbGVjdChzY3JpcHQsIEdDX0JJTik7XHJcblx0XHRcdFx0R0MuY29sbGVjdFVSTChzY3JpcHQuc3JjLCBHQ19CSU4pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0YWRkRXZlbnQgOiBmdW5jdGlvbihldnQpIHtcclxuXHRcdGlmICghZXZ0KSByZXR1cm47XHJcblx0XHRpZiAoIShldnQgaW5zdGFuY2VvZiBFdmVudCkpIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBdHRlbXB0ZWQgdG8gYWRkIGFuIG9iamVjdCB0aGF0IHdhc24ndCBhbiBFdmVudCEgXCIgKyBldnQpO1xyXG5cdFx0XHJcblx0XHRpZiAoIWV2dC5zaG91bGRBcHBlYXIoKSkgcmV0dXJuO1xyXG5cdFx0aWYgKCFldnQuaWQpXHJcblx0XHRcdGV2dC5pZCA9IFwiTG9jYWxFdmVudF9cIiArICgrK3RoaXMuX2xvY2FsSWQpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQvL25vdyBhZGRpbmcgZXZlbnQgdG8gbWFwXHJcblx0XHR0aGlzLmV2ZW50TGlzdFtldnQuaWRdID0gZXZ0O1xyXG5cdFx0aWYgKGV2dC5sb2NhdGlvbikge1xyXG5cdFx0XHR0aGlzLmV2ZW50TWFwLnB1dChldnQubG9jYXRpb24ueCwgZXZ0LmxvY2F0aW9uLnksIGV2dCk7XHJcblx0XHR9IGVsc2UgaWYgKGV2dC5sb2NhdGlvbnMpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldnQubG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIGxvYyA9IGV2dC5sb2NhdGlvbnNbaV07XHJcblx0XHRcdFx0dGhpcy5ldmVudE1hcC5wdXQobG9jLngsIGxvYy55LCBldnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vcmVnaXN0ZXJpbmcgbGlzdGVuZXJzIG9uIHRoZSBldmVudFxyXG5cdFx0ZXZ0Lm9uKFwibW92aW5nXCIsIGZ1bmN0aW9uKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSl7XHJcblx0XHRcdC8vU3RhcnRlZCBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFx0XHRzZWxmLmV2ZW50TWFwLnB1dChkZXN0WCwgZGVzdFksIHRoaXMpO1xyXG5cdFx0XHRzZWxmLmV2ZW50TWFwLnJlbW92ZShzcmNYLCBzcmNZLCB0aGlzKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBkaXIgPSBuZXcgVEhSRUUuVmVjdG9yMyhzcmNYLWRlc3RYLCAwLCBkZXN0WS1zcmNZKTtcclxuXHRcdFx0dmFyIGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdGlmIChsc3QpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFsc3RbaV0gfHwgbHN0W2ldID09IHRoaXMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJlbnRlcmluZy10aWxlXCIsIGRpciwgZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwiZW50ZXJpbmctdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBkaXIuc2V0KHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpLm5lZ2F0ZSgpO1xyXG5cdFx0XHRsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChzcmNYLCBzcmNZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImxlYXZpbmctdGlsZVwiLCBkaXIsIHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJsZWF2aW5nLXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0ZXZ0Lm9uKFwibW92ZWRcIiwgZnVuY3Rpb24oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKXtcclxuXHRcdFx0Ly9GaW5pc2hlZCBtb3ZpbmcgZnJvbSB0aGUgb2xkIHRpbGVcclxuXHRcdFx0XHJcblx0XHRcdHZhciBkaXIgPSBuZXcgVEhSRUUuVmVjdG9yMyhzcmNYLWRlc3RYLCAwLCBkZXN0WS1zcmNZKTtcclxuXHRcdFx0dmFyIGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdGlmIChsc3QpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFsc3RbaV0gfHwgbHN0W2ldID09IHRoaXMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJlbnRlcmVkLXRpbGVcIiwgZGlyLCBkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJlbnRlcmVkLXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlyLnNldChzcmNYLWRlc3RYLCAwLCBkZXN0WS1zcmNZKS5uZWdhdGUoKTtcclxuXHRcdFx0bHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoc3JjWCwgc3JjWSk7XHJcblx0XHRcdGlmIChsc3QpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFsc3RbaV0gfHwgbHN0W2ldID09IHRoaXMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJsZWZ0LXRpbGVcIiwgZGlyLCBzcmNYLCBzcmNZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwibGVmdC10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0dmFyIGF2YXRhciA9IGV2dC5nZXRBdmF0YXIodGhpcyk7XHJcblx0XHRpZiAoYXZhdGFyKSB7XHJcblx0XHRcdHZhciBsb2MgPSBldnQubG9jYXRpb247XHJcblx0XHRcdHZhciBsb2MzID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbihsb2MueCwgbG9jLnksIGxvYy56KTtcclxuXHRcdFx0YXZhdGFyLnBvc2l0aW9uLnNldChsb2MzKTtcclxuXHRcdFx0YXZhdGFyLnVwZGF0ZU1hdHJpeCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5zcHJpdGVOb2RlLmFkZChhdmF0YXIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRldnQuZW1pdChcImNyZWF0ZWRcIik7XHJcblx0fSxcclxuXHRcclxuXHRsb2FkU3ByaXRlIDogZnVuY3Rpb24oZXZ0aWQsIGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5tYXJrTG9hZGluZyhcIlNQUklURV9cIitldnRpZCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR2YXIgZGlyID0gdGhpcy5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoZXZ0aWQpO1xyXG5cdFx0XHRpZiAoIWRpcikge1xyXG5cdFx0XHRcdGNhbGxiYWNrKChcIk5vIHN1YmZvbGRlciBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGZpbGUgPSBkaXIuZ2V0Q2hpbGRCeU5hbWUoZmlsZW5hbWUpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRjYWxsYmFjaygoXCJObyBhc3NldCB3aXRoIG5hbWUgJ1wiK2ZpbGVuYW1lK1wiJyBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0ZmlsZS5nZXRCbG9iKFwiaW1hZ2UvcG5nXCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEpO1xyXG5cdFx0XHRcdEdDLmNvbGxlY3RVUkwodXJsLCBHQ19CSU4pO1xyXG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIHVybCk7XHJcblx0XHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiU1BSSVRFX1wiK2V2dGlkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNhbGxiYWNrKGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2luaXRQbGF5ZXJDaGFyYWN0ZXIgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghd2luZG93LnBsYXllcikge1xyXG5cdFx0XHR3aW5kb3cucGxheWVyID0gbmV3IFBsYXllckNoYXIoKTtcclxuXHRcdH1cclxuXHRcdHZhciB3YXJwID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCB8fCAwO1xyXG5cdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbd2FycF07XHJcblx0XHRpZiAoIXdhcnApIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiUmVxdWVzdGVkIHdhcnAgbG9jYXRpb24gZG9lc24ndCBleGlzdDpcIiwgd2luZG93LnRyYW5zaXRpb25fd2FycHRvKTtcclxuXHRcdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbMF07XHJcblx0XHR9XHJcblx0XHRpZiAoIXdhcnApIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbWFwIGhhcyBubyB3YXJwcyEhXCIpO1xyXG5cdFx0XHJcblx0XHRwbGF5ZXIucmVzZXQoKTtcclxuXHRcdHBsYXllci53YXJwVG8od2FycCk7XHJcblx0XHRcclxuXHRcdHRoaXMuYWRkRXZlbnQocGxheWVyKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0ZGlzcGF0Y2ggOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgZXZ0cyA9IHRoaXMuZXZlbnRNYXAuZ2V0KHgsIHkpO1xyXG5cdFx0aWYgKCFldnRzKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRldnRzW2ldLmVtaXQuYXBwbHkoZXZ0c1tpXSwgYXJncyk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvL1xyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9tYXBSdW5TdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRNYXBSdW5TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9tYXBSdW5TdGF0ZSkge1xyXG5cdFx0XHR0aGlzLl9tYXBSdW5TdGF0ZSA9IHtcclxuXHRcdFx0XHRsb2FkVG90YWwgOiAwLFxyXG5cdFx0XHRcdGxvYWRQcm9ncmVzcyA6IDAsXHJcblx0XHRcdFx0bG9hZGluZ0Fzc2V0cyA6IHt9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlzU3RhcnRlZCA6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXJ0UXVldWUgOiBbXSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRlbmRRdWV1ZSA6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuX21hcFJ1blN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0bWFya0xvYWRpbmcgOiBmdW5jdGlvbihhc3NldElkKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdHN0YXRlLmxvYWRUb3RhbCsrO1xyXG5cdFx0aWYgKGFzc2V0SWQpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKVxyXG5cdFx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0gPSAwO1xyXG5cdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKys7XHJcblx0XHR9XHJcblx0fSxcclxuXHRtYXJrTG9hZEZpbmlzaGVkIDogZnVuY3Rpb24oYXNzZXRJZCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRzdGF0ZS5sb2FkUHJvZ3Jlc3MrKztcclxuXHRcdGlmIChhc3NldElkKSB7XHJcblx0XHRcdGlmICghc3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSlcclxuXHRcdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdID0gMDtcclxuXHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXS0tO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL1RPRE8gYmVnaW4gbWFwIHN0YXJ0XHJcblx0XHRpZiAoc3RhdGUubG9hZFByb2dyZXNzID49IHN0YXRlLmxvYWRUb3RhbCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJTVEFSVCBNQVBcIik7XHJcblx0XHRcdHRoaXMuX2V4ZWN1dGVNYXBTdGFydENhbGxiYWNrcygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0cXVldWVGb3JNYXBTdGFydCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKCFzdGF0ZS5pc1N0YXJ0ZWQpIHtcclxuXHRcdFx0c3RhdGUuc3RhcnRRdWV1ZS5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfZXhlY3V0ZU1hcFN0YXJ0Q2FsbGJhY2tzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbGxiYWNrO1xyXG5cdFx0d2hpbGUgKGNhbGxiYWNrID0gc3RhdGUuc3RhcnRRdWV1ZS5zaGlmdCgpKSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRzdGF0ZS5pc1N0YXJ0ZWQgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0X2V4ZWN1dGVNYXBFbmRDYWxsYmFja3MgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRNYXBSdW5TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgY2FsbGJhY2s7XHJcblx0XHR3aGlsZSAoY2FsbGJhY2sgPSBzdGF0ZS5lbmRRdWV1ZS5zaGlmdCgpKSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHQvLyBzdGF0ZS5pc1N0YXJ0ZWQgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0XHJcblx0XHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvZ2ljIExvb3AgYW5kIE1hcCBCZWhhdmlvcnNcclxuXHRjYW1lcmFMb2dpY3M6IG51bGwsXHJcblx0XHJcblx0bG9naWNMb29wIDogZnVuY3Rpb24oZGVsdGEpe1xyXG5cdFx0aWYgKHRoaXMuZXZlbnRMaXN0KSB7XHJcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gdGhpcy5ldmVudExpc3QpIHtcclxuXHRcdFx0XHR2YXIgZXZ0ID0gdGhpcy5ldmVudExpc3RbbmFtZV07XHJcblx0XHRcdFx0aWYgKCFldnQpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGV2dC5lbWl0KFwidGlja1wiLCBkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY2FtZXJhTG9naWNzKSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jYW1lcmFMb2dpY3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR0aGlzLmNhbWVyYUxvZ2ljc1tpXS5jYWxsKHRoaXMsIGRlbHRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcblxyXG5mdW5jdGlvbiBfX3Rlc3RfX291dHB1dFRyZWUob2JqLCBpbmRlbnQpIHtcclxuXHRpbmRlbnQgPSAoaW5kZW50ID09PSB1bmRlZmluZWQpPyAwIDogaW5kZW50O1xyXG5cdFxyXG5cdHZhciBvdXQgPSBcIltcIitvYmoudHlwZStcIjogXCI7XHJcblx0b3V0ICs9ICgoIW9iai5uYW1lKT9cIjxVbm5hbWVkPlwiOm9iai5uYW1lKTtcclxuXHRvdXQgKz0gXCIgXVwiO1xyXG5cdFxyXG5cdHN3aXRjaCAob2JqLnR5cGUpIHtcclxuXHRcdGNhc2UgXCJNZXNoXCI6XHJcblx0XHRcdG91dCArPSBcIiAodmVydHM9XCIrb2JqLmdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcclxuXHRcdFx0b3V0ICs9IFwiIGZhY2VzPVwiK29iai5nZW9tZXRyeS5mYWNlcy5sZW5ndGg7XHJcblx0XHRcdG91dCArPSBcIiBtYXQ9XCIrb2JqLm1hdGVyaWFsLm5hbWU7XHJcblx0XHRcdG91dCArPSBcIilcIjtcclxuXHRcdFx0YnJlYWs7XHJcblx0fVxyXG5cdFxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50OyBpKyspIHtcclxuXHRcdG91dCA9IFwifCBcIiArIG91dDtcclxuXHR9XHJcblx0Y29uc29sZS5sb2cob3V0KTtcclxuXHRcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG5cdFx0X190ZXN0X19vdXRwdXRUcmVlKG9iai5jaGlsZHJlbltpXSwgaW5kZW50KzEpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbiIsIi8vIG1hcC1zZXR1cC5qc1xyXG4vLyBEZWZpbmVzIHNvbWUgb2YgdGhlIHNldHVwIGZ1bmN0aW9ucyBmb3IgTWFwLmpzIGluIGEgc2VwYXJhdGUgZmlsZSwgZm9yIG9yZ2FuaXphdGlvblxyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgbVNldHVwID0gXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdFxyXG5cdHNldHVwUmlnZ2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gU2V0dXAgTGlnaHRpbmcgUmlnZ2luZ1xyXG5cdFx0e1xyXG5cdFx0XHR2YXIgbGlnaHRkZWYgPSBleHRlbmQoeyBcImRlZmF1bHRcIjogdHJ1ZSB9LCB0aGlzLm1ldGFkYXRhLmxpZ2h0aW5nKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsaWdodHNldHVwID0gbVNldHVwLmxpZ2h0aW5nW3RoaXMubWV0YWRhdGEuZG9tYWluXTtcclxuXHRcdFx0aWYgKCFsaWdodHNldHVwKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE1hcCBEb21haW4hXCIsIHRoaXMubWV0YWRhdGEuZG9tYWluKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsID0gbGlnaHRzZXR1cC5jYWxsKHRoaXMsIGxpZ2h0ZGVmKTtcclxuXHRcdFx0dGhpcy5zY2VuZS5hZGQobCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFNldHVwIENhbWVyYSBSaWdnaW5nXHJcblx0XHR7XHQvLyBGb3IgY2FtZXJhIHR5cGVzLCBzZWUgdGhlIENhbWVyYSB0eXBlcyB3aWtpIHBhZ2VcclxuXHRcdFx0dmFyIGNhbWRlZiA9IHRoaXMubWV0YWRhdGEuY2FtZXJhO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFjYW1kZWYpIHsgdGhyb3cgbmV3IEVycm9yKFwiTWFwIGNvbnRhaW5zIG5vIHNldHVwIGZvciBkb21haW4hXCIpOyB9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgY2FtZm4gPSBtU2V0dXAuY2FtZXJhW2NhbWRlZi50eXBlXTtcclxuXHRcdFx0aWYgKCFjYW1mbikgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBDYW1lcmEgVHlwZSFcIiwgY2FtZGVmLnR5cGUpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGMgPSBjYW1mbi5jYWxsKHRoaXMsIGNhbWRlZik7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKGMpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRjYW1lcmEgOiB7XHJcblx0XHRvcnRobyA6IGZ1bmN0aW9uKGNhbWRlZikge1xyXG5cdFx0XHR2YXIgc2NyV2lkdGggPSAkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKTtcclxuXHRcdFx0dmFyIHNjckhlaWdodCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG5vZGUubmFtZSA9IFwiT3Rocm9ncmFwaGljIENhbWVyYSBSaWdcIjtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYShzY3JXaWR0aC8tMiwgc2NyV2lkdGgvMiwgc2NySGVpZ2h0LzIsIHNjckhlaWdodC8tMiwgMSwgMTAwMCk7XHJcblx0XHRcdHRoaXMuY2FtZXJhLnBvc2l0aW9uLnkgPSAxMDA7XHJcblx0XHRcdHRoaXMuY2FtZXJhLnJvYXRpb24ueCA9IC1NYXRoLlBJIC8gMjtcclxuXHRcdFx0bm9kZS5hZGQodGhpcy5jYW1lcmEpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRnZW40IDogZnVuY3Rpb24oY2FtZGVmKSB7XHJcblx0XHRcdHZhciBzY3JXaWR0aCA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0XHR2YXIgc2NySGVpZ2h0ID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0bm9kZS5uYW1lID0gXCJHZW4gNCBDYW1lcmEgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgY2FtbGlzdCA9IGNhbWRlZltcImNhbWVyYXNcIl07XHJcblx0XHRcdGlmICghY2FtbGlzdCkgdGhyb3cgbmV3IEVycm9yKFwiTm8gY2FtZXJhcyBkZWZpbmVkIVwiKTtcclxuXHRcdFx0Zm9yICh2YXIgY25hbWUgaW4gY2FtbGlzdCkge1xyXG5cdFx0XHRcdHZhciBjID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDU1LCBzY3JXaWR0aCAvIHNjckhlaWdodCwgMSwgMTAwMCk7XHJcblx0XHRcdFx0Yy5uYW1lID0gXCJDYW1lcmEgW1wiK2NuYW1lK1wiXVwiO1xyXG5cdFx0XHRcdGMubXlfY2FtZXJhID0gYztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgY3Jvb3Q7XHJcblx0XHRcdFx0aWYgKCFjYW1saXN0W2NuYW1lXS5maXhlZENhbWVyYSkge1xyXG5cdFx0XHRcdFx0Y3Jvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0XHRcdGNyb290LmFkZChjKTtcclxuXHRcdFx0XHRcdGNyb290Lm15X2NhbWVyYSA9IGM7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBjcCA9IGNhbWxpc3RbY25hbWVdLnBvc2l0aW9uIHx8IFswLCA1LjQ1LCA1LjNdO1xyXG5cdFx0XHRcdGMucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHRcdGMubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuOCwgMCkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBjYiA9IGNhbWxpc3RbY25hbWVdLmJlaGF2aW9yIHx8IFwiZm9sbG93UGxheWVyXCI7XHJcblx0XHRcdFx0dmFyIGNiID0gbVNldHVwLmNhbUJlaGF2aW9yc1tjYl0uY2FsbCh0aGlzLCBjYW1saXN0W2NuYW1lXSwgYywgY3Jvb3QpO1xyXG5cdFx0XHRcdGlmIChjYikge1xyXG5cdFx0XHRcdFx0dGhpcy5jYW1lcmFMb2dpY3MucHVzaChjYik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG5vZGUuYWRkKGNyb290IHx8IGMpO1xyXG5cdFx0XHRcdHRoaXMuY2FtZXJhc1tjbmFtZV0gPSBjO1xyXG5cdFx0XHRcdGlmIChjbmFtZSA9PSAwKSB0aGlzLmNhbWVyYSA9IGM7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDc1LCBzY3JXaWR0aCAvIHNjckhlaWdodCwgMSwgMTAwMCk7XHJcblx0XHRcdC8vIHRoaXMuY2FtZXJhLnBvc2l0aW9uLnkgPSA1O1xyXG5cdFx0XHQvLyB0aGlzLmNhbWVyYS5wb3NpdGlvbi56ID0gNTtcclxuXHRcdFx0Ly8gdGhpcy5jYW1lcmEucm90YXRpb24ueCA9IC01NSAqIChNYXRoLlBJIC8gMTgwKTtcclxuXHRcdFx0Ly9UT0RPIHNldCB1cCBhIGNhbWVyYSBmb3IgZWFjaCBsYXllclxyXG5cdFx0XHQvLyBub2RlLmFkZCh0aGlzLmNhbWVyYSk7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGdlbjUgOiBmdW5jdGlvbihjYW1kZWYpIHtcclxuXHRcdFx0dmFyIHNjcldpZHRoID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0XHRcdHZhciBzY3JIZWlnaHQgPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIkdlbiA1IENhbWVyYSBSaWdcIjtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDc1LCBzY3JXaWR0aCAvIHNjckhlaWdodCwgMSwgMTAwMCk7XHJcblx0XHRcdC8vcGFyc2UgdXAgdGhlIGdlbiA1IGNhbWVyYSBkZWZpbml0aW9uc1xyXG5cdFx0XHRub2RlLmFkZCh0aGlzLmNhbWVyYSk7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH0sXHJcblx0fSxcclxuXHRcclxuXHRjYW1CZWhhdmlvcnMgOiB7XHJcblx0XHRmb2xsb3dQbGF5ZXIgOiBmdW5jdGlvbihjZGVmLCBjYW0sIGNhbVJvb3QpIHtcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi5zZXQocGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uKTtcclxuXHRcdFx0XHQvL1RPRE8gbmVnYXRlIG1vdmluZyB1cCBhbmQgZG93biB3aXRoIGp1bXBpbmdcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdFxyXG5cdGxpZ2h0aW5nIDoge1xyXG5cdFx0aW50ZXJpb3IgOiBmdW5jdGlvbihsaWdodGRlZikge1xyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIkludGVyaW9yIExpZ2h0aW5nIFJpZ1wiO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGxpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgpO1xyXG5cdFx0XHRsaWdodC5wb3NpdGlvbi5zZXQoMCwgNzUsIDEpO1xyXG5cdFx0XHRsaWdodC5jYXN0U2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0bGlnaHQub25seVNoYWRvdyA9IHRydWU7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0RhcmtuZXNzID0gMC43O1xyXG5cdFx0XHRsaWdodC5zaGFkb3dCaWFzID0gMC4wMDE7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgc2htID0gbGlnaHRkZWYuc2hhZG93bWFwIHx8IHt9O1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFOZWFyID0gc2htLm5lYXIgfHwgMTtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhRmFyID0gc2htLmZhciB8fCAyMDA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYVRvcCA9IHNobS50b3AgfHwgMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUJvdHRvbSA9IHNobS5ib3R0b20gfHwgLTMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFMZWZ0ID0gc2htLmxlZnQgfHwgLTMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFSaWdodCA9IHNobS5yaWdodCB8fCAzMDtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0LnNoYWRvd01hcFdpZHRoID0gc2htLndpZHRoIHx8IDUxMjtcclxuXHRcdFx0bGlnaHQuc2hhZG93TWFwSGVpZ2h0ID0gc2htLmhlaWdodCB8fCA1MTI7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBsaWdodC5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0bm9kZS5hZGQobGlnaHQpO1xyXG5cdFx0XHRcclxuXHRcdFx0REVCVUcuX3NoYWRvd0NhbWVyYSA9IGxpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIE9SSUdJTiA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZmZiwgMC45KTtcclxuXHRcdFx0bGlnaHQucG9zaXRpb24uc2V0KDQsIDQsIDQpO1xyXG5cdFx0XHRsaWdodC5sb29rQXQoT1JJR0lOKTtcclxuXHRcdFx0bm9kZS5hZGQobGlnaHQpO1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZmZiwgMC45KTtcclxuXHRcdFx0bGlnaHQucG9zaXRpb24uc2V0KC00LCA0LCA0KTtcclxuXHRcdFx0bGlnaHQubG9va0F0KE9SSUdJTik7XHJcblx0XHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0XHQvL3RoaXMuc2NlbmUuYWRkKG5vZGUpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0ZXh0ZXJpb3IgOiBmdW5jdGlvbihsaWdodGRlZikge1xyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIkV4dGVyaW9yIExpZ2h0aW5nIFJpZ1wiO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGxpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgpO1xyXG5cdFx0XHRsaWdodC5wb3NpdGlvbi5zZXQoLTEwLCA3NSwgLTMwKTtcclxuXHRcdFx0bGlnaHQuY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRcdC8vIGxpZ2h0Lm9ubHlTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dEYXJrbmVzcyA9IDAuNztcclxuXHRcdFx0bGlnaHQuc2hhZG93QmlhcyA9IDAuMDAxO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNobSA9IGxpZ2h0ZGVmLnNoYWRvd21hcCB8fCB7fTtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhTmVhciA9IHNobS5uZWFyIHx8IDE7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUZhciA9IHNobS5mYXIgfHwgMjAwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFUb3AgPSBzaG0udG9wIHx8IDMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFCb3R0b20gPSBzaG0uYm90dG9tIHx8IC0zMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhTGVmdCA9IHNobS5sZWZ0IHx8IC0zMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhUmlnaHQgPSBzaG0ucmlnaHQgfHwgMzA7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodC5zaGFkb3dNYXBXaWR0aCA9IHNobS53aWR0aCB8fCA1MTI7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd01hcEhlaWdodCA9IHNobS5oZWlnaHQgfHwgNTEyO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbGlnaHQuc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFx0XHJcblx0XHRcdERFQlVHLl9zaGFkb3dDYW1lcmEgPSBsaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0aGVsbCA6IGZ1bmN0aW9uKGxpZ2h0ZGVmKSB7XHJcblx0XHRcdC8vVE9ETyBEb3JyaXRvIER1bmdlb25cclxuXHRcdH0sXHJcblx0fSxcclxuXHRcclxuXHRnZXREb3JpdG9EdW5nZW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gc2V0IHRoaXMubWV0YWRhdGFcclxuXHRcdC8vVE9ETyBzZXQgdGhpcy5tYXBtb2RlbFxyXG5cdH0sXHJcblx0XHJcbn0iLCIvLyBtdGwtbG9hZGVyLmpzXHJcbi8vIEEgVEhSRUUuanMgd2F2ZWZyb250IE1hdGVyaWFsIExpYnJhcnkgbG9hZGVyXHJcbi8vIENvcGllZCBtb3N0bHkgd2hvbGVzYWxlIGZyb20gdGhlIHRocmVlLmpzIGV4YW1wbGVzIGZvbGRlci5cclxuLy8gT3JpZ2luYWwgYXV0aG9yczogbXJkb29iLCBhbmdlbHh1YW5jaGFuZ1xyXG5cclxudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcblxyXG5mdW5jdGlvbiBNdGxMb2FkZXIobXRsZmlsZSwgbG9hZFRleHR1cmUsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5tdGxmaWxlID0gbXRsZmlsZTtcclxuXHR0aGlzLmxvYWRUZXh0dXJlID0gbG9hZFRleHR1cmU7XHJcblx0XHJcblx0dGhpcy5nYyA9IG9wdHMuZ2M7XHJcbn1cclxuaW5oZXJpdHMoTXRsTG9hZGVyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoTXRsTG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdGxvYWRUZXh0dXJlIDogbnVsbCxcclxuXHRtdGxmaWxlIDogbnVsbCxcclxuXHRcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5tdGxmaWxlKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBNVEwgZmlsZSBnaXZlbiFcIik7XHJcblx0XHRpZiAoIXRoaXMubG9hZFRleHR1cmUpIHRocm93IG5ldyBFcnJvcihcIk5vIGxvYWRUZXh0dXJlIGZ1bmN0aW9uIGdpdmVuIVwiKTtcclxuXHRcdFxyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHZhciBwYXJzZWQgPSBzY29wZS5wYXJzZSh0aGlzLm10bGZpbGUpO1xyXG5cdFx0dGhpcy5lbWl0KFwibG9hZFwiLCBwYXJzZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0cGFyc2UgOiBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHR2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCBcIlxcblwiICk7XHJcblx0XHR2YXIgaW5mbyA9IHt9O1xyXG5cdFx0dmFyIGRlbGltaXRlcl9wYXR0ZXJuID0gL1xccysvO1xyXG5cdFx0dmFyIG1hdGVyaWFsc0luZm8gPSB7fTtcclxuXHRcdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkgKyspIHtcclxuXHRcdFx0XHR2YXIgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0XHRcdGxpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAobGluZS5sZW5ndGggPT09IDAgfHwgbGluZS5jaGFyQXQoIDAgKSA9PT0gJyMnKSBjb250aW51ZTsgLy9pZ25vcmUgYmxhbmsgbGluZXMgYW5kIGNvbW1lbnRzXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gRmluZCB3aGVyZSB0aGUgZmlyc3Qgc3BhY2UgaXMgaW4gYSBsaW5lIGFuZCBzcGxpdCBvZmYga2V5IGFuZCB2YWx1ZSBiYXNlZCBvbiB0aGF0XHJcblx0XHRcdFx0dmFyIHBvcyA9IGxpbmUuaW5kZXhPZignICcpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBrZXkgPSAocG9zID49IDApID8gbGluZS5zdWJzdHJpbmcoMCwgcG9zKSA6IGxpbmU7XHJcblx0XHRcdFx0a2V5ID0ga2V5LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHZhbHVlID0gKHBvcyA+PSAwKSA/IGxpbmUuc3Vic3RyaW5nKHBvcyArIDEpIDogXCJcIjtcclxuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlLnRyaW0oKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoa2V5ID09PSBcIm5ld210bFwiKSB7IC8vIE5ldyBtYXRlcmlhbCBkZWZpbml0aW9uXHJcblx0XHRcdFx0XHRpbmZvID0geyBuYW1lOiB2YWx1ZSB9O1xyXG5cdFx0XHRcdFx0bWF0ZXJpYWxzSW5mb1sgdmFsdWUgXSA9IGluZm87XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHR9IGVsc2UgaWYgKCBpbmZvICkgeyAvLyBJZiB3ZSBhcmUgd29ya2luZyB3aXRoIGEgbWF0ZXJpYWxcclxuXHRcdFx0XHRcdGlmIChrZXkgPT09IFwia2FcIiB8fCBrZXkgPT09IFwia2RcIiB8fCBrZXkgPT09IFwia3NcIikge1xyXG5cdFx0XHRcdFx0XHR2YXIgc3MgPSB2YWx1ZS5zcGxpdChkZWxpbWl0ZXJfcGF0dGVybiwgMyk7XHJcblx0XHRcdFx0XHRcdGluZm9ba2V5XSA9IFtwYXJzZUZsb2F0KHNzWzBdKSwgcGFyc2VGbG9hdChzc1sxXSksIHBhcnNlRmxvYXQoc3NbMl0pXTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGluZm9ba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBPbmNlIHdlJ3ZlIHBhcnNlZCBvdXQgYWxsIHRoZSBtYXRlcmlhbHMsIGxvYWQgdGhlbSBpbnRvIGEgXCJjcmVhdG9yXCJcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtYXRDcmVhdG9yID0gbmV3IE1hdGVyaWFsQ3JlYXRvcih0aGlzLmxvYWRUZXh0dXJlLCB0aGlzLmdjKTtcclxuXHRcdFx0bWF0Q3JlYXRvci5zZXRNYXRlcmlhbHMobWF0ZXJpYWxzSW5mbyk7XHJcblx0XHRcdHJldHVybiBtYXRDcmVhdG9yO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJlcnJvclwiLCBlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGVuc3VyZVBvd2VyT2ZUd29fICggaW1hZ2UgKSB7XHJcblx0aWYgKCAhIFRIUkVFLk1hdGguaXNQb3dlck9mVHdvKCBpbWFnZS53aWR0aCApIHx8ICEgVEhSRUUuTWF0aC5pc1Bvd2VyT2ZUd28oIGltYWdlLmhlaWdodCApICkge1xyXG5cdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiY2FudmFzXCIgKTtcclxuXHRcdGNhbnZhcy53aWR0aCA9IG5leHRIaWdoZXN0UG93ZXJPZlR3b18oIGltYWdlLndpZHRoICk7XHJcblx0XHRjYW52YXMuaGVpZ2h0ID0gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggaW1hZ2UuaGVpZ2h0ICk7XHJcblx0XHRcclxuXHRcdHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cdFx0Y3R4LmRyYXdJbWFnZSggaW1hZ2UsIDAsIDAsIGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQsIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCApO1xyXG5cdFx0cmV0dXJuIGNhbnZhcztcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIGltYWdlO1xyXG59XHJcbiovXHJcbmZ1bmN0aW9uIG5leHRIaWdoZXN0UG93ZXJPZlR3b18oIHggKSB7XHJcblx0LS14O1xyXG5cdGZvciAoIHZhciBpID0gMTsgaSA8IDMyOyBpIDw8PSAxICkge1xyXG5cdFx0eCA9IHggfCB4ID4+IGk7XHJcblx0fVxyXG5cdHJldHVybiB4ICsgMTtcclxufVxyXG5cclxuXHJcbi8vIFRoZSBvcmlnaW5hbCB2ZXJzaW9uIGNhbWUgd2l0aCBzZXZlcmFsIG9wdGlvbnMsIHdoaWNoIHdlIGNhbiBzaW1wbHkgYXNzdW1lIHdpbGwgYmUgdGhlIGRlZmF1bHRzXHJcbi8vXHRcdHNpZGU6IEFsd2F5cyBhcHBseSB0byBUSFJFRS5Gcm9udFNpZGVcclxuLy9cdFx0d3JhcDogVGhpcyB3aWxsIGFjdHVhbGx5IGJlIHNwZWNpZmllZCBJTiB0aGUgTVRMLCBiZWNhdXNlIGl0IGhhcyB0aGF0IHN1cHBvcnRcclxuLy9cdFx0bm9ybWFsaXplUkdCOiBmYWxzZSAtIGFzc3VtZWRcclxuLy9cdFx0aWdub3JlWmVyb1JHQjogZmFsc2UgXHJcbi8vXHRcdGludmVydFRyYW5zcGFyZW5jeTogZmFsc2UgLSBkID0gMSBpcyBvcGFxdWVcclxuZnVuY3Rpb24gTWF0ZXJpYWxDcmVhdG9yKGxvYWRUZXh0dXJlLCBnYykge1xyXG5cdHRoaXMubG9hZFRleHR1cmUgPSBsb2FkVGV4dHVyZTtcclxuXHR0aGlzLmdjID0gZ2M7XHJcbn1cclxuTWF0ZXJpYWxDcmVhdG9yLnByb3RvdHlwZSA9IHtcclxuXHRzZXRNYXRlcmlhbHMgOiBmdW5jdGlvbihtYXRJbmZvKSB7XHJcblx0XHR0aGlzLm1hdGVyaWFsc0luZm8gPSBtYXRJbmZvO1xyXG5cdFx0dGhpcy5tYXRlcmlhbHMgPSB7fTtcclxuXHRcdHRoaXMubWF0ZXJpYWxzQXJyYXkgPSBbXTtcclxuXHRcdHRoaXMubmFtZUxvb2t1cCA9IHt9O1xyXG5cdH0sXHJcblx0XHJcblx0cHJlbG9hZCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgbW4gaW4gdGhpcy5tYXRlcmlhbHNJbmZvKSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlKG1uKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGdldEluZGV4IDogZnVuY3Rpb24obWF0TmFtZSkge1xyXG5cdFx0cmV0dXJuIHRoaXMubmFtZUxvb2t1cFttYXROYW1lXTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldEFzQXJyYXkgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBpbmRleCA9IDA7XHJcblx0XHRmb3IgKHZhciBtbiBpbiB0aGlzLm1hdGVyaWFsc0luZm8pIHtcclxuXHRcdFx0dGhpcy5tYXRlcmlhbHNBcnJheVtpbmRleF0gPSB0aGlzLmNyZWF0ZShtbik7XHJcblx0XHRcdHRoaXMubmFtZUxvb2t1cFttbl0gPSBpbmRleDtcclxuXHRcdFx0aW5kZXgrKztcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm1hdGVyaWFsc0FycmF5O1xyXG5cdH0sXHJcblx0XHJcblx0Y3JlYXRlIDogZnVuY3Rpb24gKG1hdE5hbWUpIHtcclxuXHRcdGlmICh0aGlzLm1hdGVyaWFsc1ttYXROYW1lXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlTWF0ZXJpYWxfKG1hdE5hbWUpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzW21hdE5hbWVdO1xyXG5cdH0sXHJcblx0XHJcblx0Y3JlYXRlTWF0ZXJpYWxfIDogZnVuY3Rpb24obWF0TmFtZSkge1xyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHZhciBtYXQgPSB0aGlzLm1hdGVyaWFsc0luZm9bbWF0TmFtZV07XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHRuYW1lOiBtYXROYW1lLFxyXG5cdFx0XHRzaWRlOiBUSFJFRS5Gcm9udFNpZGUsXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBwcm9wIGluIG1hdCkge1xyXG5cdFx0XHR2YXIgdmFsdWUgPSBtYXRbcHJvcF07XHJcblx0XHRcdHN3aXRjaCAocHJvcC50b0xvd2VyQ2FzZSgpKSB7XHJcblx0XHRcdFx0Y2FzZSBcImtkXCI6IC8vIERpZmZ1c2UgY29sb3JcclxuXHRcdFx0XHRcdHBhcmFtc1snZGlmZnVzZSddID0gbmV3IFRIUkVFLkNvbG9yKCkuZnJvbUFycmF5KHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJrYVwiOiAvLyBBbWJpZW50IGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2FtYmllbnQnXSA9IG5ldyBUSFJFRS5Db2xvcigpLmZyb21BcnJheSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia3NcIjogLy8gU3BlY3VsYXIgY29sb3JcclxuXHRcdFx0XHRcdHBhcmFtc1snc3BlY3VsYXInXSA9IG5ldyBUSFJFRS5Db2xvcigpLmZyb21BcnJheSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia2VcIjogLy8gRW1pc3Npb24gKG5vbi1zdGFuZGFyZClcclxuXHRcdFx0XHRcdHBhcmFtc1snZW1pc3NpdmUnXSA9IG5ldyBUSFJFRS5Db2xvcih2YWx1ZSwgdmFsdWUsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfa2RcIjogLy8gRGlmZnVzZSB0ZXh0dXJlIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ21hcCddID0gbWFwO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2thXCI6IC8vIEFtYmllbnQgdGV4dHVyZSBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydsaWdodE1hcCddID0gbWFwO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9rc1wiOiAvLyBTcGVjdWxhciBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydzcGVjdWxhck1hcCddID0gbWFwO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9kXCI6IC8vIEFscGhhIHRleHR1cmUgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snYWxwaGFNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJidW1wXCI6XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9idW1wXCI6IC8vIEJ1bXAgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snYnVtcE1hcCddID0gbWFwO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpZiAoYXJncy5ibSkgcGFyYW1zWydidW1wU2NhbGUnXSA9IGFyZ3MuYm07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibnNcIjogLy8gU3BlY3VsYXIgZXhwb25lbnRcclxuXHRcdFx0XHRcdHBhcmFtc1snc2hpbmluZXNzJ10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJkXCI6IC8vIFRyYW5zcGFyZW5jeVxyXG5cdFx0XHRcdFx0aWYgKHZhbHVlIDwgMSkge1xyXG5cdFx0XHRcdFx0XHRwYXJhbXNbJ3RyYW5zcGFyZW50J10gPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRwYXJhbXNbJ29wYWNpdHknXSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRwYXJhbXNbJ2FscGhhVGVzdCddID0gMC4wNTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVW5oYW5kbGVkIE1UTCBkYXRhOlwiLCBwcm9wLCBcIj1cIiwgdmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gV0hBVD8hPyEgTk8hISEhISFcclxuXHRcdC8vIGlmICggcGFyYW1zWyAnZGlmZnVzZScgXSApIHtcclxuXHRcdC8vIFx0aWYgKCAhcGFyYW1zWyAnYW1iaWVudCcgXSkgcGFyYW1zWyAnYW1iaWVudCcgXSA9IHBhcmFtc1sgJ2RpZmZ1c2UnIF07XHJcblx0XHQvLyBcdHBhcmFtc1sgJ2NvbG9yJyBdID0gcGFyYW1zWyAnZGlmZnVzZScgXTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0dGhpcy5tYXRlcmlhbHNbIG1hdE5hbWUgXSA9IG5ldyBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbCggcGFyYW1zICk7XHJcblx0XHRzY29wZS5nYy5jb2xsZWN0KCB0aGlzLm1hdGVyaWFsc1ttYXROYW1lXSApO1xyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzWyBtYXROYW1lIF07XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX190ZXh0dXJlTWFwKGFyZ3MpIHtcclxuXHRcdFx0aWYgKGFyZ3MudGltZUFwcGxpY2FibGUpIHtcclxuXHRcdFx0XHR2YXIgbm93ID0gbW9tZW50KCk7XHJcblx0XHRcdFx0aWYgKG1vbWVudC5pc0JlZm9yZShhcmdzLnRpbWVBcHBsaWNhYmxlWzBdKSB8fCBtb21lbnQuaXNBZnRlcihhcmdzLnRpbWVBcHBsaWNhYmxlWzFdKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7IC8vSWdub3JlIHRoaXMgbWFwLCBpZiB0aW1lIGlzIG5vdCBhcHBsaWNhYmxlIHRvIGl0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gaGFuZGxlIGN1Ym1hcHMhIG5ldyBUSFJFRS5UZXh0dXJlKFtzZXQgb2YgNiBpbWFnZXNdKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVE9ETyBsb29rIGludG8gaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9UZXh0dXJlcy9Db21wcmVzc2VkVGV4dHVyZVxyXG5cdFx0XHQvLyBVc2luZyBcIi5kZHNcIiBmb3JtYXQ/XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0aW1hZ2Uuc3JjID0gREVGX1RFWFRVUkU7XHJcblx0XHRcdHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoaW1hZ2UpO1xyXG5cdFx0XHRzY29wZS5nYy5jb2xsZWN0KHRleHR1cmUpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZyhcIk1UTF9cIithcmdzLnNyYyk7XHJcblx0XHRcdHNjb3BlLmxvYWRUZXh0dXJlKGFyZ3Muc3JjLCBmdW5jdGlvbih1cmwpe1xyXG5cdFx0XHRcdC8vIEV2ZW4gdGhvdWdoIHRoZSBpbWFnZXMgYXJlIGluIG1lbW9yeSwgYXBwYXJlbnRseSB0aGV5IHN0aWxsIGFyZW4ndCBcImxvYWRlZFwiXHJcblx0XHRcdFx0Ly8gYXQgdGhlIHBvaW50IHdoZW4gdGhleSBhcmUgYXNzaWduZWQgdG8gdGhlIHNyYyBhdHRyaWJ1dGUuXHJcblx0XHRcdFx0aW1hZ2Uub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIk1UTF9cIithcmdzLnNyYyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0aW1hZ2Uuc3JjID0gdXJsO1xyXG5cdFx0XHRcdC8vIGltYWdlID0gZW5zdXJlUG93ZXJPZlR3b18oIGltYWdlICk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltYWdlO1xyXG5cdFx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghYXJncy5jbGFtcCkgeyAvL3VuZGVmaW5lZCBvciBmYWxzZVxyXG5cdFx0XHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLkNsYW1wVG9FZGdlV3JhcHBpbmc7XHJcblx0XHRcdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLkNsYW1wVG9FZGdlV3JhcHBpbmc7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChhcmdzWydvX3UnXSB8fCBhcmdzWydvX3YnXSkge1xyXG5cdFx0XHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFZlY3RvcjIoYXJnc1snb191J10gfHwgMCwgYXJnc1snb192J10gfHwgMCk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIHRleHR1cmUuYW5pc290cm9weSA9IDE2O1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIHRleHR1cmU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fc3BsaXRUZXhBcmcoYXJnKSB7XHJcblx0XHRcdHZhciBjb21wcyA9IGFyZy5zcGxpdChcIiBcIik7XHJcblx0XHRcdHZhciB0ZXhEZWYgPSB7fTtcclxuXHRcdFx0Ly8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XYXZlZnJvbnRfLm9ial9maWxlI1RleHR1cmVfb3B0aW9uc1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0c3dpdGNoIChjb21wc1tpXSkge1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ibGVuZHVcIjogXHJcblx0XHRcdFx0XHRcdHRleERlZltcImJsZW5kdVwiXSA9IChjb21wc1tpKzFdICE9IFwib2ZmXCIpO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrOyAvL2NvbnN1bWUgdGhlIGFyZ3VtZW50XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJsZW5kdlwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJibGVuZHZcIl0gPSAoY29tcHNbaSsxXSAhPSBcIm9mZlwiKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItYm9vc3RcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYm9vc3RcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1tbVwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJtbV9iYXNlXCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wibW1fZ2FpblwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7XHJcblx0XHRcdFx0XHRcdGkgKz0gMjsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLW9cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wib191XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wib192XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzJdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJvX3dcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krM10pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdGkgKz0gMzsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLXNcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wic191XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wic192XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzJdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJzX3dcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krM10pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdGkgKz0gMzsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLXRcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widF91XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widF92XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzJdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0X3dcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krM10pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdGkgKz0gMzsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLXRleHJlc1wiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0ZXhyZXNcIl0gPSBjb21wc1tpKzFdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1jbGFtcFwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJjbGFtcFwiXSA9IChjb21wc1tpKzFdID09IFwib25cIik7IC8vZGVmYXVsdCBvZmZcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItYm1cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYm1cIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1pbWZjaGFuXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImltZmNoYW5cIl0gPSBjb21wc1tpKzFdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10eXBlXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInR5cGVcIl0gPSBjb21wc1tpKzFdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQvLyBDdXN0b20gcHJvcGVydGllc1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10aW1lYXBwXCI6ICAvL1RpbWUgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHQvLyAtdGltZWFwcCBbc3RhcnRUaW1lXSBbZW5kVGltZV1cclxuXHRcdFx0XHRcdFx0Ly8gICB3aGVyZSB0aGUgdGltZXMgYXJlIGZvcm1hdHRlZCBhcyBmb2xsb3dzOiBtMDBbZDAwW2gwMFttMDBdXV1cclxuXHRcdFx0XHRcdFx0Ly8gICBlYWNoIHNlY3Rpb24gaW4gc2VxdWVuY2UgaXMgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0Ly8gc3RhcnRUaW1lID0gc3RhcnQgb2YgdGhlIHRpbWUsIGluY2x1c2l2ZSwgd2hlbiB0aGUgZ2l2ZW4gdGV4dHVyZSBpcyBhcHBsaWNhYmxlXHJcblx0XHRcdFx0XHRcdC8vIGVuZFRpbWUgPSBlbmQgb2YgdGhlIHRpbWUsIGluY2x1c2l2ZSwgd2hlbiB0aGUgZ2l2ZW4gdGV4dHVyZSBpcyBhcHBsaWNhYmxlXHJcblx0XHRcdFx0XHRcdHZhciBzdGFydFRpbWUgPSBjb21wc1tpKzFdO1xyXG5cdFx0XHRcdFx0XHR2YXIgZW5kVGltZSA9IGNvbXBzW2krMl07XHJcblx0XHRcdFx0XHRcdGkgKz0gMjtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdC8vdGV4RGVmW1widGltZWFwcFwiXSA9IFtjb21wc1tpKzFdLCBjb21wc1tpKzJdXTtcclxuXHRcdFx0XHRcdFx0dmFyIHN0LCBlbmQ7XHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgcmVzID0gL20oXFxkXFxkKSg/OmQoXFxkXFxkKSg/OmgoXFxkXFxkKSg/Om0oXFxkXFxkKSk/KT8pPy9pLmV4ZWMoc3RhcnRUaW1lKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXJlcykgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aW1lc3RhbXAgZm9yIC10aW1lYXBwIHN0YXJ0VGltZVwiKTtcclxuXHRcdFx0XHRcdFx0XHRzdCA9IG1vbWVudCgpLm1vbnRoKHJlc1sxXSkuc3RhcnRPZihcIm1vbnRoXCIpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbMl0pIHsgc3QuZGF0ZShyZXNbMl0pOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1szXSkgeyBzdC5ob3VyKHJlc1szXSk7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzRdKSB7IHN0Lm1pbnV0ZShyZXNbNF0pOyB9XHJcblx0XHRcdFx0XHRcdH17XHJcblx0XHRcdFx0XHRcdFx0dmFyIHJlcyA9IC9tKFxcZFxcZCkoPzpkKFxcZFxcZCkoPzpoKFxcZFxcZCkoPzptKFxcZFxcZCkpPyk/KT8vaS5leGVjKGVuZFRpbWUpO1xyXG5cdFx0XHRcdFx0XHRcdGlmICghcmVzKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRpbWVzdGFtcCBmb3IgLXRpbWVhcHAgZW5kVGltZVwiKTtcclxuXHRcdFx0XHRcdFx0XHRlbmQgPSBtb21lbnQoKS5tb250aChyZXNbMV0pLmVuZE9mKFwibW9udGhcIik7XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1syXSkgeyBlbmQuZGF0ZShyZXNbMl0pLmVuZE9mKFwiZGF5XCIpOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1szXSkgeyBlbmQuaG91cihyZXNbM10pLmVuZE9mKFwiaG91clwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbNF0pIHsgZW5kLm1pbnV0ZShyZXNbNF0pLmVuZE9mKFwibWludXRlXCIpOyB9XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0aWYgKGVuZC5pc0JlZm9yZShzdCkpIGVuZC5hZGQoMSwgXCJ5ZWFyXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRpbWVBcHBsaWNhYmxlXCJdID0gW3N0LCBlbmRdO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdC8vQXNzdW1lIHRoZSBzb3VyY2UgaXMgdGhlIGxhc3QgdGhpbmcgd2UnbGwgZmluZFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWYuc3JjID0gY29tcHMuc2xpY2UoaSkuam9pbihcIiBcIik7XHJcblx0XHRcdFx0XHRcdHRleERlZi5hcmdzID0gY29tcHMuc2xpY2UoMCwgaSkuam9pbihcIiBcIik7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0ZXhEZWY7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0ZXhEZWY7XHJcblx0XHR9XHJcblx0fSxcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXRsTG9hZGVyOyIsIi8vIG9iai1sb2FkZXIuanNcclxuLy8gQSBUSFJFRS5qcyB3YXZlZnJvbnQgb2JqZWN0IGxvYWRlclxyXG4vLyBDb3BpZWQgbW9zdGx5IHdob2xlc2FsZSBmcm9tIHRoZSB0aHJlZS5qcyBleGFtcGxlcyBmb2xkZXIuXHJcbi8vIE9yaWdpbmFsIGF1dGhvcnM6IG1yZG9vYiwgYW5nZWx4dWFuY2hhbmdcclxuXHJcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG52YXIgTXRsTG9hZGVyID0gcmVxdWlyZShcIi4vbXRsLWxvYWRlclwiKTtcclxuXHJcbmZ1bmN0aW9uIE9iakxvYWRlcihvYmpmaWxlLCBtdGxmaWxlLCBmaWxlU3lzLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub2JqZmlsZSA9IG9iamZpbGU7XHJcblx0dGhpcy5tdGxmaWxlID0gbXRsZmlsZTtcclxuXHR0aGlzLmZpbGVTeXMgPSBmaWxlU3lzO1xyXG5cdFxyXG5cdGlmIChvcHRzLmdjKSB7XHJcblx0XHRpZiAodHlwZW9mIG9wdHMuZ2MgPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0dGhpcy5nYyA9IEdDLmdldEJpbihvcHRzLmdjKTtcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy5nYyA9IG9wdHMuZ2M7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRoaXMuZ2MgPSBHQy5nZXRCaW4oKTtcclxuXHR9XHJcblx0XHJcbn07XHJcbmluaGVyaXRzKE9iakxvYWRlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE9iakxvYWRlci5wcm90b3R5cGUsIHtcclxuXHRvYmpmaWxlIDogbnVsbCxcclxuXHRtdGxmaWxlIDogbnVsbCxcclxuXHRmaWxlU3lzIDogbnVsbCxcclxuXHRcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghKHRoaXMub2JqZmlsZSAmJiB0aGlzLm10bGZpbGUpKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gT0JKIGZpbGUgb3IgTVRMIGZpbGUgZ2l2ZW4hXCIpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdFx0dmFyIG10bExvYWRlciA9IG5ldyBNdGxMb2FkZXIodGhpcy5tdGxmaWxlLCB0aGlzLmZpbGVTeXMsIHtcclxuXHRcdFx0XCJnY1wiOiB0aGlzLmdjLFxyXG5cdFx0fSk7XHJcblx0XHRtdGxMb2FkZXIub24oXCJsb2FkXCIsIGZ1bmN0aW9uKG1hdExpYikge1xyXG5cdFx0XHRcclxuXHRcdFx0bWF0TGliLnByZWxvYWQoKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBvYmplY3QgPSBzY29wZS5wYXJzZShzY29wZS5vYmpmaWxlKTtcclxuXHRcdFx0b2JqZWN0LnRyYXZlcnNlKGZ1bmN0aW9uKG9iamVjdCl7XHJcblx0XHRcdFx0aWYgKG9iamVjdCBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpIHtcclxuXHRcdFx0XHRcdGlmIChvYmplY3QubWF0ZXJpYWwubmFtZSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWF0ID0gbWF0TGliLmNyZWF0ZShvYmplY3QubWF0ZXJpYWwubmFtZSk7XHJcblx0XHRcdFx0XHRcdGlmIChtYXQpIG9iamVjdC5tYXRlcmlhbCA9IG1hdDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG9iamVjdC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRvYmplY3QubmFtZSA9IFwiTG9hZGVkIE1lc2hcIjtcclxuXHRcdFx0XHJcblx0XHRcdHNjb3BlLmVtaXQoXCJsb2FkXCIsIG9iamVjdCk7XHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRzY29wZS5lbWl0KFwiZXJyb3JcIiwgZSk7XHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5sb2FkKCk7XHJcblx0fSxcclxufSk7XHJcblxyXG4vL1RoZXNlIHdvdWxkIGJlIENPTlNUUyBpbiBub2RlLmpzLCBidXQgd2UncmUgaW4gdGhlIGJyb3dzZXIgbm93OlxyXG5cclxuLy8gdiBmbG9hdCBmbG9hdCBmbG9hdFxyXG52YXIgVkVSVEVYX1BBVFRFUk4gPSAvdiggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyB2biBmbG9hdCBmbG9hdCBmbG9hdFxyXG52YXIgTk9STUFMX1BBVFRFUk4gPSAvdm4oICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykvO1xyXG5cclxuLy8gdnQgZmxvYXQgZmxvYXRcclxudmFyIFVWX1BBVFRFUk4gPSAvdnQoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykvO1xyXG5cclxuLy8gZiB2ZXJ0ZXggdmVydGV4IHZlcnRleCAuLi5cclxudmFyIEZBQ0VfUEFUVEVSTjEgPSAvZiggK1xcZCspKCArXFxkKykoICtcXGQrKSggK1xcZCspPy87XHJcblxyXG4vLyBmIHZlcnRleC91diB2ZXJ0ZXgvdXYgdmVydGV4L3V2IC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMiA9IC9mKCArKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspKT8vO1xyXG5cclxuLy8gZiB2ZXJ0ZXgvdXYvbm9ybWFsIHZlcnRleC91di9ub3JtYWwgdmVydGV4L3V2L25vcm1hbCAuLi5cclxudmFyIEZBQ0VfUEFUVEVSTjMgPSAvZiggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSk/LztcclxuXHJcbi8vIGYgdmVydGV4Ly9ub3JtYWwgdmVydGV4Ly9ub3JtYWwgdmVydGV4Ly9ub3JtYWwgLi4uIFxyXG52YXIgRkFDRV9QQVRURVJONCA9IC9mKCArKFxcZCspXFwvXFwvKFxcZCspKSggKyhcXGQrKVxcL1xcLyhcXGQrKSkoICsoXFxkKylcXC9cXC8oXFxkKykpKCArKFxcZCspXFwvXFwvKFxcZCspKT8vXHJcblxyXG5cclxuT2JqTG9hZGVyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHJcblx0dmFyIGZhY2Vfb2Zmc2V0ID0gMDtcclxuXHRcclxuXHR2YXIgZ3JvdXAgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHR2YXIgb2JqZWN0ID0gZ3JvdXA7XHJcblx0XHJcblx0dmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0dmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKCBnZW9tZXRyeSwgbWF0ZXJpYWwgKTtcclxuXHRcclxuXHR2YXIgdmVydGljZXMgPSBbXTtcclxuXHR2YXIgdmVydGljZXNDb3VudCA9IDA7XHJcblx0dmFyIG5vcm1hbHMgPSBbXTtcclxuXHR2YXIgdXZzID0gW107XHJcblx0XHJcblx0Ly9CZWdpbiBwYXJzaW5nIGhlcmVcclxuXHJcblx0dmFyIGxpbmVzID0gZGF0YS5zcGxpdCggXCJcXG5cIiApO1xyXG5cdGZvciAoIHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSArKyApIHtcclxuXHRcdHZhciBsaW5lID0gbGluZXNbIGkgXTtcclxuXHRcdGxpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFxyXG5cdFx0dmFyIHJlc3VsdDtcclxuXHRcdFxyXG5cdFx0aWYgKGxpbmUubGVuZ3RoID09IDAgfHwgbGluZS5jaGFyQXQoMCkgPT0gXCIjXCIpIFxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdGVsc2UgXHJcblx0XHRpZiAoKHJlc3VsdCA9IFZFUlRFWF9QQVRURVJOLmV4ZWMobGluZSkpICE9PSBudWxsKSB7XHJcblx0XHRcdC8vIFtcInYgMS4wIDIuMCAzLjBcIiwgXCIxLjBcIiwgXCIyLjBcIiwgXCIzLjBcIl1cclxuXHRcdFx0dmVydGljZXMucHVzaCh2ZWN0b3IoXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDEgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDIgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDMgXSlcclxuXHRcdFx0KSk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gTk9STUFMX1BBVFRFUk4uZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcInZuIDEuMCAyLjAgMy4wXCIsIFwiMS4wXCIsIFwiMi4wXCIsIFwiMy4wXCJdXHJcblx0XHRcdG5vcm1hbHMucHVzaCh2ZWN0b3IoXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDEgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDIgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDMgXSlcclxuXHRcdFx0KSk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gVVZfUEFUVEVSTi5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1widnQgMC4xIDAuMlwiLCBcIjAuMVwiLCBcIjAuMlwiXVxyXG5cdFx0XHR1dnMucHVzaCh1dihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk4xLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEgMiAzXCIsIFwiMVwiLCBcIjJcIiwgXCIzXCIsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShbIHJlc3VsdFsgMSBdLCByZXN1bHRbIDIgXSwgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNCBdIF0pO1xyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk4yLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEvMSAyLzIgMy8zXCIsIFwiIDEvMVwiLCBcIjFcIiwgXCIxXCIsIFwiIDIvMlwiLCBcIjJcIiwgXCIyXCIsIFwiIDMvM1wiLCBcIjNcIiwgXCIzXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoXHJcblx0XHRcdFx0WyByZXN1bHRbIDIgXSwgcmVzdWx0WyA1IF0sIHJlc3VsdFsgOCBdLCByZXN1bHRbIDExIF0gXSwgLy9mYWNlc1xyXG5cdFx0XHRcdFsgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNiBdLCByZXN1bHRbIDkgXSwgcmVzdWx0WyAxMiBdIF0gLy91dlxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjMuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8xLzEgMi8yLzIgMy8zLzNcIiwgXCIgMS8xLzFcIiwgXCIxXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8yLzJcIiwgXCIyXCIsIFwiMlwiLCBcIjJcIiwgXCIgMy8zLzNcIiwgXCIzXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFxyXG5cdFx0XHRcdFsgcmVzdWx0WyAyIF0sIHJlc3VsdFsgNiBdLCByZXN1bHRbIDEwIF0sIHJlc3VsdFsgMTQgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA3IF0sIHJlc3VsdFsgMTEgXSwgcmVzdWx0WyAxNSBdIF0sIC8vdXZcclxuXHRcdFx0XHRbIHJlc3VsdFsgNCBdLCByZXN1bHRbIDggXSwgcmVzdWx0WyAxMiBdLCByZXN1bHRbIDE2IF0gXSAvL25vcm1hbFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjQuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8vMSAyLy8yIDMvLzNcIiwgXCIgMS8vMVwiLCBcIjFcIiwgXCIxXCIsIFwiIDIvLzJcIiwgXCIyXCIsIFwiMlwiLCBcIiAzLy8zXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShcclxuXHRcdFx0XHRbIHJlc3VsdFsgMiBdLCByZXN1bHRbIDUgXSwgcmVzdWx0WyA4IF0sIHJlc3VsdFsgMTEgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyBdLCAvL3V2XHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgOSBdLCByZXN1bHRbIDEyIF0gXSAvL25vcm1hbFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoIC9ebyAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gb2JqZWN0XHJcblx0XHRcdG1lc2hOKCk7XHJcblx0XHRcdGZhY2Vfb2Zmc2V0ID0gZmFjZV9vZmZzZXQgKyB2ZXJ0aWNlcy5sZW5ndGg7XHJcblx0XHRcdHZlcnRpY2VzID0gW107XHJcblx0XHRcdG9iamVjdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRvYmplY3QubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpO1xyXG5cdFx0XHRncm91cC5hZGQoIG9iamVjdCApO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKCAvXmcgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIGdyb3VwXHJcblx0XHRcdC8vIG1lc2hOKCBsaW5lLnN1YnN0cmluZyggMiApLnRyaW0oKSwgdW5kZWZpbmVkICk7XHJcblx0XHRcdG1lc2gubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL151c2VtdGwgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIG1hdGVyaWFsXHJcblx0XHRcdG1lc2hOKCB1bmRlZmluZWQsIGxpbmUuc3Vic3RyaW5nKCA3ICkudHJpbSgpICk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCk7XHJcblx0XHRcdC8vIG1hdGVyaWFsLm5hbWUgPSBsaW5lLnN1YnN0cmluZyggNyApLnRyaW0oKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIG1lc2gubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuXHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoIC9ebXRsbGliIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBtdGwgZmlsZVxyXG5cdFx0XHQvLyBpZiAoIG10bGxpYkNhbGxiYWNrICkge1xyXG5cdFx0XHQvLyBcdHZhciBtdGxmaWxlID0gbGluZS5zdWJzdHJpbmcoIDcgKTtcclxuXHRcdFx0Ly8gXHRtdGxmaWxlID0gbXRsZmlsZS50cmltKCk7XHJcblx0XHRcdC8vIFx0bXRsbGliQ2FsbGJhY2soIG10bGZpbGUgKTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL15zIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBTbW9vdGggc2hhZGluZ1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coIFwiVEhSRUUuT0JKTVRMTG9hZGVyOiBVbmhhbmRsZWQgbGluZSBcIiArIGxpbmUgKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0bWVzaE4odW5kZWZpbmVkLCB1bmRlZmluZWQpOyAvL0FkZCBsYXN0IG9iamVjdFxyXG5cdHJldHVybiBncm91cDtcclxuXHJcblxyXG5cdGZ1bmN0aW9uIG1lc2hOKCBtZXNoTmFtZSwgbWF0ZXJpYWxOYW1lICkge1xyXG5cdFx0aWYgKCB2ZXJ0aWNlcy5sZW5ndGggPiAwICYmIGdlb21ldHJ5LmZhY2VzLmxlbmd0aCA+IDAgKSB7XHJcblx0XHRcdGdlb21ldHJ5LnZlcnRpY2VzID0gdmVydGljZXM7XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tZXRyeS5tZXJnZVZlcnRpY2VzKCk7XHJcblx0XHRcdGdlb21ldHJ5LmNvbXB1dGVGYWNlTm9ybWFscygpO1xyXG5cdFx0XHRnZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcclxuXHRcdFx0Z2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nU3BoZXJlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRvYmplY3QuYWRkKCBtZXNoICk7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmdjLmNvbGxlY3QoZ2VvbWV0cnkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Z2VvbWV0cnkgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdFx0bWVzaCA9IG5ldyBUSFJFRS5NZXNoKCBnZW9tZXRyeSwgbWF0ZXJpYWwgKTtcclxuXHRcdFx0dmVydGljZXNDb3VudCA9IDA7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIGlmICggbWVzaE5hbWUgIT09IHVuZGVmaW5lZCApIG1lc2gubmFtZSA9IG1lc2hOYW1lO1xyXG5cdFx0XHJcblx0XHRpZiAoIG1hdGVyaWFsTmFtZSAhPT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCk7XHJcblx0XHRcdG1hdGVyaWFsLm5hbWUgPSBtYXRlcmlhbE5hbWU7XHJcblx0XHRcdFxyXG5cdFx0XHRtZXNoLm1hdGVyaWFsID0gbWF0ZXJpYWw7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdGZ1bmN0aW9uIGFkZF9mYWNlKCBhLCBiLCBjLCBub3JtYWxzX2luZHMgKSB7XHJcblx0XHRpZiAoIG5vcm1hbHNfaW5kcyA9PT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRnZW9tZXRyeS5mYWNlcy5wdXNoKCBmYWNlMyhcclxuXHRcdFx0XHRwYXJzZUludCggYSApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGIgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBjICkgLSAoZmFjZV9vZmZzZXQgKyAxKVxyXG5cdFx0XHQpICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRnZW9tZXRyeS5mYWNlcy5wdXNoKCBmYWNlMyhcclxuXHRcdFx0XHRwYXJzZUludCggYSApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGIgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBjICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHRub3JtYWxzWyBwYXJzZUludCggbm9ybWFsc19pbmRzWyAwIF0gKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHRcdFx0bm9ybWFsc1sgcGFyc2VJbnQoIG5vcm1hbHNfaW5kc1sgMSBdICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0XHRcdG5vcm1hbHNbIHBhcnNlSW50KCBub3JtYWxzX2luZHNbIDIgXSApIC0gMSBdLmNsb25lKClcclxuXHRcdFx0XHRdXHJcblx0XHRcdCkgKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gYWRkX3V2cyggYSwgYiwgYyApIHtcclxuXHRcdGdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnNbIDAgXS5wdXNoKCBbXHJcblx0XHRcdHV2c1sgcGFyc2VJbnQoIGEgKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHR1dnNbIHBhcnNlSW50KCBiICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0dXZzWyBwYXJzZUludCggYyApIC0gMSBdLmNsb25lKClcclxuXHRcdF0gKTtcclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gaGFuZGxlX2ZhY2VfbGluZShmYWNlcywgdXZzLCBub3JtYWxzX2luZHMpIHtcclxuXHRcdGlmICggZmFjZXNbIDMgXSA9PT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRhZGRfZmFjZSggZmFjZXNbIDAgXSwgZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgbm9ybWFsc19pbmRzICk7XHJcblx0XHRcdGlmICghKHV2cyA9PT0gdW5kZWZpbmVkKSAmJiB1dnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF91dnMoIHV2c1sgMCBdLCB1dnNbIDEgXSwgdXZzWyAyIF0gKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICghKG5vcm1hbHNfaW5kcyA9PT0gdW5kZWZpbmVkKSAmJiBub3JtYWxzX2luZHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMyBdLCBbIG5vcm1hbHNfaW5kc1sgMCBdLCBub3JtYWxzX2luZHNbIDEgXSwgbm9ybWFsc19pbmRzWyAzIF0gXSk7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAxIF0sIGZhY2VzWyAyIF0sIGZhY2VzWyAzIF0sIFsgbm9ybWFsc19pbmRzWyAxIF0sIG5vcm1hbHNfaW5kc1sgMiBdLCBub3JtYWxzX2luZHNbIDMgXSBdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDAgXSwgZmFjZXNbIDEgXSwgZmFjZXNbIDMgXSk7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAxIF0sIGZhY2VzWyAyIF0sIGZhY2VzWyAzIF0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRpZiAoISh1dnMgPT09IHVuZGVmaW5lZCkgJiYgdXZzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRhZGRfdXZzKCB1dnNbIDAgXSwgdXZzWyAxIF0sIHV2c1sgMyBdICk7XHJcblx0XHRcdFx0YWRkX3V2cyggdXZzWyAxIF0sIHV2c1sgMiBdLCB1dnNbIDMgXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59O1xyXG5cclxuLy9jb252aWVuY2UgZnVuY3Rpb25zXHJcbmZ1bmN0aW9uIHZlY3RvciggeCwgeSwgeiApIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKCB4LCB5LCB6ICk7IH1cclxuZnVuY3Rpb24gdXYoIHUsIHYgKSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMiggdSwgdiApOyB9XHJcbmZ1bmN0aW9uIGZhY2UzKCBhLCBiLCBjLCBub3JtYWxzICkgeyByZXR1cm4gbmV3IFRIUkVFLkZhY2UzKCBhLCBiLCBjLCBub3JtYWxzICk7IH1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9iakxvYWRlcjsiLCIvLyByZW5kZXJsb29wLmpzXHJcbi8vIFRoZSBtb2R1bGUgdGhhdCBoYW5kbGVzIGFsbCB0aGUgY29tbW9uIGNvZGUgdG8gcmVuZGVyIGFuZCBkbyBnYW1lIHRpY2tzIG9uIGEgbWFwXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIHJhZiA9IHJlcXVpcmUoXCJyYWZcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0c3RhcnQgOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvLyBTZXQgdGhlIGNhbnZhcydzIGF0dHJpYnV0ZXMsIGJlY2F1c2UgdGhvc2UgXHJcblx0XHQvLyBBQ1RVQUxMWSBkZXRlcm1pbmUgaG93IGJpZyB0aGUgcmVuZGVyaW5nIGFyZWEgaXMuXHJcblx0XHR2YXIgY2FudmFzID0gJChcIiNnYW1lc2NyZWVuXCIpO1xyXG5cdFx0Y2FudmFzLmF0dHIoXCJ3aWR0aFwiLCBwYXJzZUludChjYW52YXMuY3NzKFwid2lkdGhcIikpKTtcclxuXHRcdGNhbnZhcy5hdHRyKFwiaGVpZ2h0XCIsIHBhcnNlSW50KGNhbnZhcy5jc3MoXCJoZWlnaHRcIikpKTtcclxuXHRcdFxyXG5cdFx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHRcdGNsZWFyQ29sb3IgOiAweDAwMDAwMCxcclxuXHRcdFx0dGlja3NQZXJTZWNvbmQgOiAzMCxcclxuXHRcdH0sIG9wdHMpO1xyXG5cdFx0XHJcblx0XHR3aW5kb3cudGhyZWVSZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHtcclxuXHRcdFx0YW50aWFsaWFzIDogdHJ1ZSxcclxuXHRcdFx0Y2FudmFzIDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnYW1lc2NyZWVuXCIpIFxyXG5cdFx0fSk7XHJcblx0XHR0aHJlZVJlbmRlcmVyLnNldENsZWFyQ29sb3JIZXgoIG9wdHMuY2xlYXJDb2xvciApO1xyXG5cdFx0dGhyZWVSZW5kZXJlci5hdXRvQ2xlYXIgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dGhyZWVSZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcclxuXHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwVHlwZSA9IFRIUkVFLlBDRlNoYWRvd01hcDtcclxuXHRcdFxyXG5cdFx0X3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxuXHRcdGluaXRHYW1lTG9vcCgzMCk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdHBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0Ly8gX3JlbmRlckhhbmRsZSA9IG51bGw7XHJcblx0fSxcclxuXHR1bnBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSBmYWxzZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0fSxcclxufTtcclxuXHJcblxyXG52YXIgX3JlbmRlckhhbmRsZTsgXHJcbmZ1bmN0aW9uIHJlbmRlckxvb3AoKSB7XHJcblx0dGhyZWVSZW5kZXJlci5jbGVhcigpO1xyXG5cdFxyXG5cdGlmIChjdXJyZW50TWFwICYmIGN1cnJlbnRNYXAuc2NlbmUgJiYgY3VycmVudE1hcC5jYW1lcmEpIHtcclxuXHRcdC8vUmVuZGVyIHdpdGggdGhlIG1hcCdzIGFjdGl2ZSBjYW1lcmEgb24gaXRzIGFjdGl2ZSBzY2VuZVxyXG5cdFx0dGhyZWVSZW5kZXJlci5yZW5kZXIoY3VycmVudE1hcC5zY2VuZSwgY3VycmVudE1hcC5jYW1lcmEpO1xyXG5cdH1cclxuXHRcclxuXHRpZiAoVUkuc2NlbmUgJiYgVUkuY2FtZXJhKSB7XHJcblx0XHQvL1JlbmRlciB0aGUgVUkgd2l0aCB0aGUgVUkgY2FtZXJhIGFuZCBpdHMgc2NlbmVcclxuXHRcdHRocmVlUmVuZGVyZXIuY2xlYXIoZmFsc2UsIHRydWUsIGZhbHNlKTsgLy9DbGVhciBkZXB0aCBidWZmZXJcclxuXHRcdHRocmVlUmVuZGVyZXIucmVuZGVyKFVJLnNjZW5lLCBVSS5jYW1lcmEpO1xyXG5cdH1cclxuXHRcclxuXHRpZiAoX3JlbmRlckhhbmRsZSlcclxuXHRcdF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcbn1cclxuXHJcbnZhciBwYXVzZWQgPSBmYWxzZTtcclxuZnVuY3Rpb24gaW5pdEdhbWVMb29wKHRpY2tzUGVyU2VjKSB7XHJcblx0X3JhdGUgPSAxMDAwIC8gdGlja3NQZXJTZWM7XHJcblx0XHJcblx0dmFyIGFjY3VtID0gMDtcclxuXHR2YXIgbm93ID0gMDtcclxuXHR2YXIgbGFzdCA9IG51bGw7XHJcblx0dmFyIGR0ID0gMDtcclxuXHR2YXIgd2hvbGVUaWNrO1xyXG5cdFxyXG5cdHNldEludGVydmFsKHRpbWVyVGljaywgMCk7XHJcblx0XHJcblx0ZnVuY3Rpb24gdGltZXJUaWNrKCkge1xyXG5cdFx0aWYgKHBhdXNlZCkge1xyXG5cdFx0XHRsYXN0ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0YWNjdW0gPSAwO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRkdCA9IG5vdyAtIChsYXN0IHx8IG5vdyk7XHJcblx0XHRsYXN0ID0gbm93O1xyXG5cdFx0YWNjdW0gKz0gZHQ7XHJcblx0XHRpZiAoYWNjdW0gPCBfcmF0ZSkgcmV0dXJuO1xyXG5cdFx0d2hvbGVUaWNrID0gKChhY2N1bSAvIF9yYXRlKXwwKTtcclxuXHRcdGlmICh3aG9sZVRpY2sgPD0gMCkgcmV0dXJuO1xyXG5cdFx0d2hvbGVUaWNrICo9IF9yYXRlO1xyXG5cdFx0XHJcblx0XHRpZiAoY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLmxvZ2ljTG9vcClcclxuXHRcdFx0Y3VycmVudE1hcC5sb2dpY0xvb3Aod2hvbGVUaWNrICogMC4wMSk7XHJcblx0XHRpZiAoVUkgJiYgVUkubG9naWNMb29wKVxyXG5cdFx0XHRVSS5sb2dpY0xvb3Aod2hvbGVUaWNrICogMC4wMSk7XHJcblx0XHRcclxuXHRcdGlmIChjb250cm9sbGVyICYmIGNvbnRyb2xsZXIuX3RpY2spXHJcblx0XHRcdGNvbnRyb2xsZXIuX3RpY2soKTtcclxuXHRcdFxyXG5cdFx0YWNjdW0gLT0gd2hvbGVUaWNrO1xyXG5cdH1cclxufSIsIi8vIHBvbHlmaWxsLmpzXHJcbi8vIERlZmluZXMgc29tZSBwb2x5ZmlsbHMgbmVlZGVkIGZvciB0aGUgZ2FtZSB0byBmdW5jdGlvbi5cclxuXHJcbi8vIFN0cmluZy5zdGFydHNXaXRoKClcclxuLy8gXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdzdGFydHNXaXRoJywge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcclxuXHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5sYXN0SW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbi8vIEV2ZW50VGFyZ2V0Lm9uKCkgYW5kIEV2ZW50VGFyZ2V0LmVtaXQoKVxyXG4vLyBBZGRpbmcgdGhpcyB0byBhbGxvdyBkb20gZWxlbWVudHMgYW5kIG9iamVjdHMgdG8gc2ltcGx5IGhhdmUgXCJvblwiIGFuZCBcImVtaXRcIiB1c2VkIGxpa2Ugbm9kZS5qcyBvYmplY3RzIGNhblxyXG5pZiAoIUV2ZW50VGFyZ2V0LnByb3RvdHlwZS5vbikge1xyXG5cdEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5vbiA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xyXG5cdEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5lbWl0ID0gRXZlbnRUYXJnZXQucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XHJcbn1cclxuXHJcbi8vIE1hdGguY2xhbXAoKVxyXG4vLyBcclxuaWYgKCFNYXRoLmNsYW1wKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KE1hdGgsIFwiY2xhbXBcIiwge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKG51bSwgbWluLCBtYXgpIHtcclxuXHRcdFx0bWluID0gKG1pbiAhPT0gdW5kZWZpbmVkKT8gbWluOjA7XHJcblx0XHRcdG1heCA9IChtYXggIT09IHVuZGVmaW5lZCk/IG1heDoxO1xyXG5cdFx0XHRyZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobnVtLCBtaW4pLCBtYXgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBBcnJheS50b3BcclxuLy8gUHJvdmlkZXMgZWFzeSBhY2Nlc3MgdG8gdGhlIFwidG9wXCIgb2YgYSBzdGFjaywgbWFkZSB3aXRoIHB1c2goKSBhbmQgcG9wKClcclxuaWYgKCFBcnJheS5wcm90b3R5cGUudG9wKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgXCJ0b3BcIiwge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0Ly8gc2V0OiBmdW5jdGlvbigpe30sXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiB0aGlzW3RoaXMubGVuZ3RoLTFdO1xyXG5cdFx0fSxcclxuXHR9KTtcclxufVxyXG5cclxuXHJcbi8vIE1vZGlmaWNhdGlvbnMgdG8gVEhSRUUuanNcclxue1xyXG5cdC8vIFZlY3RvcjMuc2V0KCksIG1vZGlmaWVkIHRvIGFjY2VwdCBhbm90aGVyIFZlY3RvcjNcclxuXHRUSFJFRS5WZWN0b3IzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7IHRoaXMueiA9IHguejtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7IHRoaXMueiA9IDA7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5OyB0aGlzLnogPSB6O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxuXHRcclxuXHQvLyBBbHNvIGZvciBWZWN0b3IyXHJcblx0VEhSRUUuVmVjdG9yMi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55O1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMueCA9IHg7IHRoaXMueSA9IHk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdFxyXG59XHJcblxyXG5cclxuIl19
