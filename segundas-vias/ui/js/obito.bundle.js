var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/papaparse/papaparse.min.js
var require_papaparse_min = __commonJS({
  "node_modules/papaparse/papaparse.min.js"(exports, module) {
    ((e, t) => {
      "function" == typeof define && define.amd ? define([], t) : "object" == typeof module && "undefined" != typeof exports ? module.exports = t() : e.Papa = t();
    })(exports, function r() {
      var n = "undefined" != typeof self ? self : "undefined" != typeof window ? window : void 0 !== n ? n : {};
      var d, s = !n.document && !!n.postMessage, a = n.IS_PAPA_WORKER || false, o = {}, h = 0, v = {};
      function u(e) {
        this._handle = null, this._finished = false, this._completed = false, this._halted = false, this._input = null, this._baseIndex = 0, this._partialLine = "", this._rowCount = 0, this._start = 0, this._nextChunk = null, this.isFirstChunk = true, this._completeResults = { data: [], errors: [], meta: {} }, function(e2) {
          var t = b(e2);
          t.chunkSize = parseInt(t.chunkSize), e2.step || e2.chunk || (t.chunkSize = null);
          this._handle = new i(t), (this._handle.streamer = this)._config = t;
        }.call(this, e), this.parseChunk = function(t, e2) {
          var i2 = parseInt(this._config.skipFirstNLines) || 0;
          if (this.isFirstChunk && 0 < i2) {
            let e3 = this._config.newline;
            e3 || (r2 = this._config.quoteChar || '"', e3 = this._handle.guessLineEndings(t, r2)), t = [...t.split(e3).slice(i2)].join(e3);
          }
          this.isFirstChunk && U(this._config.beforeFirstChunk) && void 0 !== (r2 = this._config.beforeFirstChunk(t)) && (t = r2), this.isFirstChunk = false, this._halted = false;
          var i2 = this._partialLine + t, r2 = (this._partialLine = "", this._handle.parse(i2, this._baseIndex, !this._finished));
          if (!this._handle.paused() && !this._handle.aborted()) {
            t = r2.meta.cursor, i2 = (this._finished || (this._partialLine = i2.substring(t - this._baseIndex), this._baseIndex = t), r2 && r2.data && (this._rowCount += r2.data.length), this._finished || this._config.preview && this._rowCount >= this._config.preview);
            if (a) n.postMessage({ results: r2, workerId: v.WORKER_ID, finished: i2 });
            else if (U(this._config.chunk) && !e2) {
              if (this._config.chunk(r2, this._handle), this._handle.paused() || this._handle.aborted()) return void (this._halted = true);
              this._completeResults = r2 = void 0;
            }
            return this._config.step || this._config.chunk || (this._completeResults.data = this._completeResults.data.concat(r2.data), this._completeResults.errors = this._completeResults.errors.concat(r2.errors), this._completeResults.meta = r2.meta), this._completed || !i2 || !U(this._config.complete) || r2 && r2.meta.aborted || (this._config.complete(this._completeResults, this._input), this._completed = true), i2 || r2 && r2.meta.paused || this._nextChunk(), r2;
          }
          this._halted = true;
        }, this._sendError = function(e2) {
          U(this._config.error) ? this._config.error(e2) : a && this._config.error && n.postMessage({ workerId: v.WORKER_ID, error: e2, finished: false });
        };
      }
      function f(e) {
        var r2;
        (e = e || {}).chunkSize || (e.chunkSize = v.RemoteChunkSize), u.call(this, e), this._nextChunk = s ? function() {
          this._readChunk(), this._chunkLoaded();
        } : function() {
          this._readChunk();
        }, this.stream = function(e2) {
          this._input = e2, this._nextChunk();
        }, this._readChunk = function() {
          if (this._finished) this._chunkLoaded();
          else {
            if (r2 = new XMLHttpRequest(), this._config.withCredentials && (r2.withCredentials = this._config.withCredentials), s || (r2.onload = y(this._chunkLoaded, this), r2.onerror = y(this._chunkError, this)), r2.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !s), this._config.downloadRequestHeaders) {
              var e2, t = this._config.downloadRequestHeaders;
              for (e2 in t) r2.setRequestHeader(e2, t[e2]);
            }
            var i2;
            this._config.chunkSize && (i2 = this._start + this._config.chunkSize - 1, r2.setRequestHeader("Range", "bytes=" + this._start + "-" + i2));
            try {
              r2.send(this._config.downloadRequestBody);
            } catch (e3) {
              this._chunkError(e3.message);
            }
            s && 0 === r2.status && this._chunkError();
          }
        }, this._chunkLoaded = function() {
          4 === r2.readyState && (r2.status < 200 || 400 <= r2.status ? this._chunkError() : (this._start += this._config.chunkSize || r2.responseText.length, this._finished = !this._config.chunkSize || this._start >= ((e2) => null !== (e2 = e2.getResponseHeader("Content-Range")) ? parseInt(e2.substring(e2.lastIndexOf("/") + 1)) : -1)(r2), this.parseChunk(r2.responseText)));
        }, this._chunkError = function(e2) {
          e2 = r2.statusText || e2;
          this._sendError(new Error(e2));
        };
      }
      function l(e) {
        (e = e || {}).chunkSize || (e.chunkSize = v.LocalChunkSize), u.call(this, e);
        var i2, r2, n2 = "undefined" != typeof FileReader;
        this.stream = function(e2) {
          this._input = e2, r2 = e2.slice || e2.webkitSlice || e2.mozSlice, n2 ? ((i2 = new FileReader()).onload = y(this._chunkLoaded, this), i2.onerror = y(this._chunkError, this)) : i2 = new FileReaderSync(), this._nextChunk();
        }, this._nextChunk = function() {
          this._finished || this._config.preview && !(this._rowCount < this._config.preview) || this._readChunk();
        }, this._readChunk = function() {
          var e2 = this._input, t = (this._config.chunkSize && (t = Math.min(this._start + this._config.chunkSize, this._input.size), e2 = r2.call(e2, this._start, t)), i2.readAsText(e2, this._config.encoding));
          n2 || this._chunkLoaded({ target: { result: t } });
        }, this._chunkLoaded = function(e2) {
          this._start += this._config.chunkSize, this._finished = !this._config.chunkSize || this._start >= this._input.size, this.parseChunk(e2.target.result);
        }, this._chunkError = function() {
          this._sendError(i2.error);
        };
      }
      function c(e) {
        var i2;
        u.call(this, e = e || {}), this.stream = function(e2) {
          return i2 = e2, this._nextChunk();
        }, this._nextChunk = function() {
          var e2, t;
          if (!this._finished) return e2 = this._config.chunkSize, i2 = e2 ? (t = i2.substring(0, e2), i2.substring(e2)) : (t = i2, ""), this._finished = !i2, this.parseChunk(t);
        };
      }
      function p(e) {
        u.call(this, e = e || {});
        var t = [], i2 = true, r2 = false;
        this.pause = function() {
          u.prototype.pause.apply(this, arguments), this._input.pause();
        }, this.resume = function() {
          u.prototype.resume.apply(this, arguments), this._input.resume();
        }, this.stream = function(e2) {
          this._input = e2, this._input.on("data", this._streamData), this._input.on("end", this._streamEnd), this._input.on("error", this._streamError);
        }, this._checkIsFinished = function() {
          r2 && 1 === t.length && (this._finished = true);
        }, this._nextChunk = function() {
          this._checkIsFinished(), t.length ? this.parseChunk(t.shift()) : i2 = true;
        }, this._streamData = y(function(e2) {
          try {
            t.push("string" == typeof e2 ? e2 : e2.toString(this._config.encoding)), i2 && (i2 = false, this._checkIsFinished(), this.parseChunk(t.shift()));
          } catch (e3) {
            this._streamError(e3);
          }
        }, this), this._streamError = y(function(e2) {
          this._streamCleanUp(), this._sendError(e2);
        }, this), this._streamEnd = y(function() {
          this._streamCleanUp(), r2 = true, this._streamData("");
        }, this), this._streamCleanUp = y(function() {
          this._input.removeListener("data", this._streamData), this._input.removeListener("end", this._streamEnd), this._input.removeListener("error", this._streamError);
        }, this);
      }
      function i(m2) {
        var n2, s2, a2, t, o2 = Math.pow(2, 53), h2 = -o2, u2 = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/, d2 = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/, i2 = this, r2 = 0, f2 = 0, l2 = false, e = false, c2 = [], p2 = { data: [], errors: [], meta: {} };
        function y2(e2) {
          return "greedy" === m2.skipEmptyLines ? "" === e2.join("").trim() : 1 === e2.length && 0 === e2[0].length;
        }
        function g2() {
          if (p2 && a2 && (k("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + v.DefaultDelimiter + "'"), a2 = false), m2.skipEmptyLines && (p2.data = p2.data.filter(function(e3) {
            return !y2(e3);
          })), _2()) {
            let t3 = function(e3, t4) {
              U(m2.transformHeader) && (e3 = m2.transformHeader(e3, t4)), c2.push(e3);
            };
            var t2 = t3;
            if (p2) if (Array.isArray(p2.data[0])) {
              for (var e2 = 0; _2() && e2 < p2.data.length; e2++) p2.data[e2].forEach(t3);
              p2.data.splice(0, 1);
            } else p2.data.forEach(t3);
          }
          function i3(e3, t3) {
            for (var i4 = m2.header ? {} : [], r4 = 0; r4 < e3.length; r4++) {
              var n3 = r4, s3 = e3[r4], s3 = ((e4, t4) => ((e5) => (m2.dynamicTypingFunction && void 0 === m2.dynamicTyping[e5] && (m2.dynamicTyping[e5] = m2.dynamicTypingFunction(e5)), true === (m2.dynamicTyping[e5] || m2.dynamicTyping)))(e4) ? "true" === t4 || "TRUE" === t4 || "false" !== t4 && "FALSE" !== t4 && (((e5) => {
                if (u2.test(e5)) {
                  e5 = parseFloat(e5);
                  if (h2 < e5 && e5 < o2) return 1;
                }
              })(t4) ? parseFloat(t4) : d2.test(t4) ? new Date(t4) : "" === t4 ? null : t4) : t4)(n3 = m2.header ? r4 >= c2.length ? "__parsed_extra" : c2[r4] : n3, s3 = m2.transform ? m2.transform(s3, n3) : s3);
              "__parsed_extra" === n3 ? (i4[n3] = i4[n3] || [], i4[n3].push(s3)) : i4[n3] = s3;
            }
            return m2.header && (r4 > c2.length ? k("FieldMismatch", "TooManyFields", "Too many fields: expected " + c2.length + " fields but parsed " + r4, f2 + t3) : r4 < c2.length && k("FieldMismatch", "TooFewFields", "Too few fields: expected " + c2.length + " fields but parsed " + r4, f2 + t3)), i4;
          }
          var r3;
          p2 && (m2.header || m2.dynamicTyping || m2.transform) && (r3 = 1, !p2.data.length || Array.isArray(p2.data[0]) ? (p2.data = p2.data.map(i3), r3 = p2.data.length) : p2.data = i3(p2.data, 0), m2.header && p2.meta && (p2.meta.fields = c2), f2 += r3);
        }
        function _2() {
          return m2.header && 0 === c2.length;
        }
        function k(e2, t2, i3, r3) {
          e2 = { type: e2, code: t2, message: i3 };
          void 0 !== r3 && (e2.row = r3), p2.errors.push(e2);
        }
        U(m2.step) && (t = m2.step, m2.step = function(e2) {
          p2 = e2, _2() ? g2() : (g2(), 0 !== p2.data.length && (r2 += e2.data.length, m2.preview && r2 > m2.preview ? s2.abort() : (p2.data = p2.data[0], t(p2, i2))));
        }), this.parse = function(e2, t2, i3) {
          var r3 = m2.quoteChar || '"', r3 = (m2.newline || (m2.newline = this.guessLineEndings(e2, r3)), a2 = false, m2.delimiter ? U(m2.delimiter) && (m2.delimiter = m2.delimiter(e2), p2.meta.delimiter = m2.delimiter) : ((r3 = ((e3, t3, i4, r4, n3) => {
            var s3, a3, o3, h3;
            n3 = n3 || [",", "	", "|", ";", v.RECORD_SEP, v.UNIT_SEP];
            for (var u3 = 0; u3 < n3.length; u3++) {
              for (var d3, f3 = n3[u3], l3 = 0, c3 = 0, p3 = 0, g3 = (o3 = void 0, new E({ comments: r4, delimiter: f3, newline: t3, preview: 10 }).parse(e3)), _3 = 0; _3 < g3.data.length; _3++) i4 && y2(g3.data[_3]) ? p3++ : (d3 = g3.data[_3].length, c3 += d3, void 0 === o3 ? o3 = d3 : 0 < d3 && (l3 += Math.abs(d3 - o3), o3 = d3));
              0 < g3.data.length && (c3 /= g3.data.length - p3), (void 0 === a3 || l3 <= a3) && (void 0 === h3 || h3 < c3) && 1.99 < c3 && (a3 = l3, s3 = f3, h3 = c3);
            }
            return { successful: !!(m2.delimiter = s3), bestDelimiter: s3 };
          })(e2, m2.newline, m2.skipEmptyLines, m2.comments, m2.delimitersToGuess)).successful ? m2.delimiter = r3.bestDelimiter : (a2 = true, m2.delimiter = v.DefaultDelimiter), p2.meta.delimiter = m2.delimiter), b(m2));
          return m2.preview && m2.header && r3.preview++, n2 = e2, s2 = new E(r3), p2 = s2.parse(n2, t2, i3), g2(), l2 ? { meta: { paused: true } } : p2 || { meta: { paused: false } };
        }, this.paused = function() {
          return l2;
        }, this.pause = function() {
          l2 = true, s2.abort(), n2 = U(m2.chunk) ? "" : n2.substring(s2.getCharIndex());
        }, this.resume = function() {
          i2.streamer._halted ? (l2 = false, i2.streamer.parseChunk(n2, true)) : setTimeout(i2.resume, 3);
        }, this.aborted = function() {
          return e;
        }, this.abort = function() {
          e = true, s2.abort(), p2.meta.aborted = true, U(m2.complete) && m2.complete(p2), n2 = "";
        }, this.guessLineEndings = function(e2, t2) {
          e2 = e2.substring(0, 1048576);
          var t2 = new RegExp(P(t2) + "([^]*?)" + P(t2), "gm"), i3 = (e2 = e2.replace(t2, "")).split("\r"), t2 = e2.split("\n"), e2 = 1 < t2.length && t2[0].length < i3[0].length;
          if (1 === i3.length || e2) return "\n";
          for (var r3 = 0, n3 = 0; n3 < i3.length; n3++) "\n" === i3[n3][0] && r3++;
          return r3 >= i3.length / 2 ? "\r\n" : "\r";
        };
      }
      function P(e) {
        return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function E(C) {
        var S = (C = C || {}).delimiter, O = C.newline, x = C.comments, I = C.step, A = C.preview, T = C.fastMode, D = null, L = false, F = null == C.quoteChar ? '"' : C.quoteChar, j = F;
        if (void 0 !== C.escapeChar && (j = C.escapeChar), ("string" != typeof S || -1 < v.BAD_DELIMITERS.indexOf(S)) && (S = ","), x === S) throw new Error("Comment character same as delimiter");
        true === x ? x = "#" : ("string" != typeof x || -1 < v.BAD_DELIMITERS.indexOf(x)) && (x = false), "\n" !== O && "\r" !== O && "\r\n" !== O && (O = "\n");
        var z = 0, M = false;
        this.parse = function(i2, t, r2) {
          if ("string" != typeof i2) throw new Error("Input must be a string");
          var n2 = i2.length, e = S.length, s2 = O.length, a2 = x.length, o2 = U(I), h2 = [], u2 = [], d2 = [], f2 = z = 0;
          if (!i2) return w();
          if (T || false !== T && -1 === i2.indexOf(F)) {
            for (var l2 = i2.split(O), c2 = 0; c2 < l2.length; c2++) {
              if (d2 = l2[c2], z += d2.length, c2 !== l2.length - 1) z += O.length;
              else if (r2) return w();
              if (!x || d2.substring(0, a2) !== x) {
                if (o2) {
                  if (h2 = [], k(d2.split(S)), R(), M) return w();
                } else k(d2.split(S));
                if (A && A <= c2) return h2 = h2.slice(0, A), w(true);
              }
            }
            return w();
          }
          for (var p2 = i2.indexOf(S, z), g2 = i2.indexOf(O, z), _2 = new RegExp(P(j) + P(F), "g"), m2 = i2.indexOf(F, z); ; ) if (i2[z] === F) for (m2 = z, z++; ; ) {
            if (-1 === (m2 = i2.indexOf(F, m2 + 1))) return r2 || u2.push({ type: "Quotes", code: "MissingQuotes", message: "Quoted field unterminated", row: h2.length, index: z }), E2();
            if (m2 === n2 - 1) return E2(i2.substring(z, m2).replace(_2, F));
            if (F === j && i2[m2 + 1] === j) m2++;
            else if (F === j || 0 === m2 || i2[m2 - 1] !== j) {
              -1 !== p2 && p2 < m2 + 1 && (p2 = i2.indexOf(S, m2 + 1));
              var y2 = v2(-1 === (g2 = -1 !== g2 && g2 < m2 + 1 ? i2.indexOf(O, m2 + 1) : g2) ? p2 : Math.min(p2, g2));
              if (i2.substr(m2 + 1 + y2, e) === S) {
                d2.push(i2.substring(z, m2).replace(_2, F)), i2[z = m2 + 1 + y2 + e] !== F && (m2 = i2.indexOf(F, z)), p2 = i2.indexOf(S, z), g2 = i2.indexOf(O, z);
                break;
              }
              y2 = v2(g2);
              if (i2.substring(m2 + 1 + y2, m2 + 1 + y2 + s2) === O) {
                if (d2.push(i2.substring(z, m2).replace(_2, F)), b2(m2 + 1 + y2 + s2), p2 = i2.indexOf(S, z), m2 = i2.indexOf(F, z), o2 && (R(), M)) return w();
                if (A && h2.length >= A) return w(true);
                break;
              }
              u2.push({ type: "Quotes", code: "InvalidQuotes", message: "Trailing quote on quoted field is malformed", row: h2.length, index: z }), m2++;
            }
          }
          else if (x && 0 === d2.length && i2.substring(z, z + a2) === x) {
            if (-1 === g2) return w();
            z = g2 + s2, g2 = i2.indexOf(O, z), p2 = i2.indexOf(S, z);
          } else if (-1 !== p2 && (p2 < g2 || -1 === g2)) d2.push(i2.substring(z, p2)), z = p2 + e, p2 = i2.indexOf(S, z);
          else {
            if (-1 === g2) break;
            if (d2.push(i2.substring(z, g2)), b2(g2 + s2), o2 && (R(), M)) return w();
            if (A && h2.length >= A) return w(true);
          }
          return E2();
          function k(e2) {
            h2.push(e2), f2 = z;
          }
          function v2(e2) {
            var t2 = 0;
            return t2 = -1 !== e2 && (e2 = i2.substring(m2 + 1, e2)) && "" === e2.trim() ? e2.length : t2;
          }
          function E2(e2) {
            return r2 || (void 0 === e2 && (e2 = i2.substring(z)), d2.push(e2), z = n2, k(d2), o2 && R()), w();
          }
          function b2(e2) {
            z = e2, k(d2), d2 = [], g2 = i2.indexOf(O, z);
          }
          function w(e2) {
            if (C.header && !t && h2.length && !L) {
              var s3 = h2[0], a3 = /* @__PURE__ */ Object.create(null), o3 = new Set(s3);
              let n3 = false;
              for (let r3 = 0; r3 < s3.length; r3++) {
                let i3 = s3[r3];
                if (a3[i3 = U(C.transformHeader) ? C.transformHeader(i3, r3) : i3]) {
                  let e3, t2 = a3[i3];
                  for (; e3 = i3 + "_" + t2, t2++, o3.has(e3); ) ;
                  o3.add(e3), s3[r3] = e3, a3[i3]++, n3 = true, (D = null === D ? {} : D)[e3] = i3;
                } else a3[i3] = 1, s3[r3] = i3;
                o3.add(i3);
              }
              n3 && console.warn("Duplicate headers found and renamed."), L = true;
            }
            return { data: h2, errors: u2, meta: { delimiter: S, linebreak: O, aborted: M, truncated: !!e2, cursor: f2 + (t || 0), renamedHeaders: D } };
          }
          function R() {
            I(w()), h2 = [], u2 = [];
          }
        }, this.abort = function() {
          M = true;
        }, this.getCharIndex = function() {
          return z;
        };
      }
      function g(e) {
        var t = e.data, i2 = o[t.workerId], r2 = false;
        if (t.error) i2.userError(t.error, t.file);
        else if (t.results && t.results.data) {
          var n2 = { abort: function() {
            r2 = true, _(t.workerId, { data: [], errors: [], meta: { aborted: true } });
          }, pause: m, resume: m };
          if (U(i2.userStep)) {
            for (var s2 = 0; s2 < t.results.data.length && (i2.userStep({ data: t.results.data[s2], errors: t.results.errors, meta: t.results.meta }, n2), !r2); s2++) ;
            delete t.results;
          } else U(i2.userChunk) && (i2.userChunk(t.results, n2, t.file), delete t.results);
        }
        t.finished && !r2 && _(t.workerId, t.results);
      }
      function _(e, t) {
        var i2 = o[e];
        U(i2.userComplete) && i2.userComplete(t), i2.terminate(), delete o[e];
      }
      function m() {
        throw new Error("Not implemented.");
      }
      function b(e) {
        if ("object" != typeof e || null === e) return e;
        var t, i2 = Array.isArray(e) ? [] : {};
        for (t in e) i2[t] = b(e[t]);
        return i2;
      }
      function y(e, t) {
        return function() {
          e.apply(t, arguments);
        };
      }
      function U(e) {
        return "function" == typeof e;
      }
      return v.parse = function(e, t) {
        var i2 = (t = t || {}).dynamicTyping || false;
        U(i2) && (t.dynamicTypingFunction = i2, i2 = {});
        if (t.dynamicTyping = i2, t.transform = !!U(t.transform) && t.transform, !t.worker || !v.WORKERS_SUPPORTED) return i2 = null, v.NODE_STREAM_INPUT, "string" == typeof e ? (e = ((e2) => 65279 !== e2.charCodeAt(0) ? e2 : e2.slice(1))(e), i2 = new (t.download ? f : c)(t)) : true === e.readable && U(e.read) && U(e.on) ? i2 = new p(t) : (n.File && e instanceof File || e instanceof Object) && (i2 = new l(t)), i2.stream(e);
        (i2 = (() => {
          var e2;
          return !!v.WORKERS_SUPPORTED && (e2 = (() => {
            var e3 = n.URL || n.webkitURL || null, t2 = r.toString();
            return v.BLOB_URL || (v.BLOB_URL = e3.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", t2, ")();"], { type: "text/javascript" })));
          })(), (e2 = new n.Worker(e2)).onmessage = g, e2.id = h++, o[e2.id] = e2);
        })()).userStep = t.step, i2.userChunk = t.chunk, i2.userComplete = t.complete, i2.userError = t.error, t.step = U(t.step), t.chunk = U(t.chunk), t.complete = U(t.complete), t.error = U(t.error), delete t.worker, i2.postMessage({ input: e, config: t, workerId: i2.id });
      }, v.unparse = function(e, t) {
        var n2 = false, _2 = true, m2 = ",", y2 = "\r\n", s2 = '"', a2 = s2 + s2, i2 = false, r2 = null, o2 = false, h2 = ((() => {
          if ("object" == typeof t) {
            if ("string" != typeof t.delimiter || v.BAD_DELIMITERS.filter(function(e2) {
              return -1 !== t.delimiter.indexOf(e2);
            }).length || (m2 = t.delimiter), "boolean" != typeof t.quotes && "function" != typeof t.quotes && !Array.isArray(t.quotes) || (n2 = t.quotes), "boolean" != typeof t.skipEmptyLines && "string" != typeof t.skipEmptyLines || (i2 = t.skipEmptyLines), "string" == typeof t.newline && (y2 = t.newline), "string" == typeof t.quoteChar && (s2 = t.quoteChar), "boolean" == typeof t.header && (_2 = t.header), Array.isArray(t.columns)) {
              if (0 === t.columns.length) throw new Error("Option columns is empty");
              r2 = t.columns;
            }
            void 0 !== t.escapeChar && (a2 = t.escapeChar + s2), t.escapeFormulae instanceof RegExp ? o2 = t.escapeFormulae : "boolean" == typeof t.escapeFormulae && t.escapeFormulae && (o2 = /^[=+\-@\t\r].*$/);
          }
        })(), new RegExp(P(s2), "g"));
        "string" == typeof e && (e = JSON.parse(e));
        if (Array.isArray(e)) {
          if (!e.length || Array.isArray(e[0])) return u2(null, e, i2);
          if ("object" == typeof e[0]) return u2(r2 || Object.keys(e[0]), e, i2);
        } else if ("object" == typeof e) return "string" == typeof e.data && (e.data = JSON.parse(e.data)), Array.isArray(e.data) && (e.fields || (e.fields = e.meta && e.meta.fields || r2), e.fields || (e.fields = Array.isArray(e.data[0]) ? e.fields : "object" == typeof e.data[0] ? Object.keys(e.data[0]) : []), Array.isArray(e.data[0]) || "object" == typeof e.data[0] || (e.data = [e.data])), u2(e.fields || [], e.data || [], i2);
        throw new Error("Unable to serialize unrecognized input");
        function u2(e2, t2, i3) {
          var r3 = "", n3 = ("string" == typeof e2 && (e2 = JSON.parse(e2)), "string" == typeof t2 && (t2 = JSON.parse(t2)), Array.isArray(e2) && 0 < e2.length), s3 = !Array.isArray(t2[0]);
          if (n3 && _2) {
            for (var a3 = 0; a3 < e2.length; a3++) 0 < a3 && (r3 += m2), r3 += k(e2[a3], a3);
            0 < t2.length && (r3 += y2);
          }
          for (var o3 = 0; o3 < t2.length; o3++) {
            var h3 = (n3 ? e2 : t2[o3]).length, u3 = false, d2 = n3 ? 0 === Object.keys(t2[o3]).length : 0 === t2[o3].length;
            if (i3 && !n3 && (u3 = "greedy" === i3 ? "" === t2[o3].join("").trim() : 1 === t2[o3].length && 0 === t2[o3][0].length), "greedy" === i3 && n3) {
              for (var f2 = [], l2 = 0; l2 < h3; l2++) {
                var c2 = s3 ? e2[l2] : l2;
                f2.push(t2[o3][c2]);
              }
              u3 = "" === f2.join("").trim();
            }
            if (!u3) {
              for (var p2 = 0; p2 < h3; p2++) {
                0 < p2 && !d2 && (r3 += m2);
                var g2 = n3 && s3 ? e2[p2] : p2;
                r3 += k(t2[o3][g2], p2);
              }
              o3 < t2.length - 1 && (!i3 || 0 < h3 && !d2) && (r3 += y2);
            }
          }
          return r3;
        }
        function k(e2, t2) {
          var i3, r3;
          return null == e2 ? "" : e2.constructor === Date ? JSON.stringify(e2).slice(1, 25) : (r3 = false, o2 && "string" == typeof e2 && o2.test(e2) && (e2 = "'" + e2, r3 = true), i3 = e2.toString().replace(h2, a2), (r3 = r3 || true === n2 || "function" == typeof n2 && n2(e2, t2) || Array.isArray(n2) && n2[t2] || ((e3, t3) => {
            for (var i4 = 0; i4 < t3.length; i4++) if (-1 < e3.indexOf(t3[i4])) return true;
            return false;
          })(i3, v.BAD_DELIMITERS) || -1 < i3.indexOf(m2) || " " === i3.charAt(0) || " " === i3.charAt(i3.length - 1)) ? s2 + i3 + s2 : i3);
        }
      }, v.RECORD_SEP = String.fromCharCode(30), v.UNIT_SEP = String.fromCharCode(31), v.BYTE_ORDER_MARK = "\uFEFF", v.BAD_DELIMITERS = ["\r", "\n", '"', v.BYTE_ORDER_MARK], v.WORKERS_SUPPORTED = !s && !!n.Worker, v.NODE_STREAM_INPUT = 1, v.LocalChunkSize = 10485760, v.RemoteChunkSize = 5242880, v.DefaultDelimiter = ",", v.Parser = E, v.ParserHandle = i, v.NetworkStreamer = f, v.FileStreamer = l, v.StringStreamer = c, v.ReadableStreamStreamer = p, n.jQuery && ((d = n.jQuery).fn.parse = function(o2) {
        var i2 = o2.config || {}, h2 = [];
        return this.each(function(e2) {
          if (!("INPUT" === d(this).prop("tagName").toUpperCase() && "file" === d(this).attr("type").toLowerCase() && n.FileReader) || !this.files || 0 === this.files.length) return true;
          for (var t = 0; t < this.files.length; t++) h2.push({ file: this.files[t], inputElem: this, instanceConfig: d.extend({}, i2) });
        }), e(), this;
        function e() {
          if (0 === h2.length) U(o2.complete) && o2.complete();
          else {
            var e2, t, i3, r2, n2 = h2[0];
            if (U(o2.before)) {
              var s2 = o2.before(n2.file, n2.inputElem);
              if ("object" == typeof s2) {
                if ("abort" === s2.action) return e2 = "AbortError", t = n2.file, i3 = n2.inputElem, r2 = s2.reason, void (U(o2.error) && o2.error({ name: e2 }, t, i3, r2));
                if ("skip" === s2.action) return void u2();
                "object" == typeof s2.config && (n2.instanceConfig = d.extend(n2.instanceConfig, s2.config));
              } else if ("skip" === s2) return void u2();
            }
            var a2 = n2.instanceConfig.complete;
            n2.instanceConfig.complete = function(e3) {
              U(a2) && a2(e3, n2.file, n2.inputElem), u2();
            }, v.parse(n2.file, n2.instanceConfig);
          }
        }
        function u2() {
          h2.splice(0, 1), e();
        }
      }), a && (n.onmessage = function(e) {
        e = e.data;
        void 0 === v.WORKER_ID && e && (v.WORKER_ID = e.workerId);
        "string" == typeof e.input ? n.postMessage({ workerId: v.WORKER_ID, results: v.parse(e.input, e.config), finished: true }) : (n.File && e.input instanceof File || e.input instanceof Object) && (e = v.parse(e.input, e.config)) && n.postMessage({ workerId: v.WORKER_ID, results: e, finished: true });
      }), (f.prototype = Object.create(u.prototype)).constructor = f, (l.prototype = Object.create(u.prototype)).constructor = l, (c.prototype = Object.create(c.prototype)).constructor = c, (p.prototype = Object.create(u.prototype)).constructor = p, v;
    });
  }
});

// ui/ts/shared/validators/date.ts
function pad2(value) {
  return String(value).padStart(2, "0");
}
function toYear(yearRaw) {
  const y = Number(yearRaw);
  if (yearRaw.length === 2) {
    return y <= 29 ? 2e3 + y : 1900 + y;
  }
  return y;
}
function normalizeDate(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  const m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(input);
  let day = "";
  let month = "";
  let year = "";
  if (m) {
    day = m[1];
    month = m[2];
    year = m[3];
  } else {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 8) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else if (digits.length === 6) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 6);
    }
  }
  if (!day || !month || !year) return "";
  const yyyy = toYear(year);
  const dd = Number(day);
  const mm = Number(month);
  if (!isValidDateParts(dd, mm, yyyy)) return "";
  return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
}
function validateDateDetailed(raw) {
  const input = String(raw || "").trim();
  if (!input) return { ok: false, code: "EMPTY", message: "Campo vazio" };
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(input);
  let day = "";
  let month = "";
  let year = "";
  if (m) {
    day = m[1];
    month = m[2];
    year = m[3];
  } else {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 8) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else if (digits.length === 6) {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 6);
    } else {
      return { ok: false, code: "FORMAT", message: "Formato inv\xE1lido \u2014 use DD/MM/AAAA (ex.: 31/12/2024)" };
    }
  }
  const dd = Number(day);
  const mm = Number(month);
  const yyyy = toYear(year);
  if (isNaN(mm) || mm < 1 || mm > 12) return { ok: false, code: "MONTH", message: "M\xEAs inv\xE1lido (01\u201312)" };
  if (isNaN(dd) || dd < 1 || dd > 31) return { ok: false, code: "DAY", message: "Dia inv\xE1lido (1\u201331)" };
  const d = new Date(yyyy, mm - 1, dd);
  if (!(d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd)) {
    return { ok: false, code: "NONEXISTENT", message: "Data inexistente \u2014 verifique dia e m\xEAs (ex.: 31/02/2024 n\xE3o existe)" };
  }
  return { ok: true, code: "OK", message: `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}` };
}
function isValidDateParts(day, month, year) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

// ui/ts/shared/validators/time.ts
function pad22(value) {
  return String(value).padStart(2, "0");
}
function normalizeTime(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  const m = /^(\d{1,2})[:]?(\d{2})$/.exec(input);
  if (!m) return "";
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!isValidTimeParts(hh, mm)) return "";
  return `${pad22(hh)}:${pad22(mm)}`;
}
function isValidTimeParts(hour, minute) {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  return true;
}

// node_modules/cpf-cnpj-validator/dist/cpf-cnpj-validator.es.js
var BLACKLIST = [
  "00000000000",
  "11111111111",
  "22222222222",
  "33333333333",
  "44444444444",
  "55555555555",
  "66666666666",
  "77777777777",
  "88888888888",
  "99999999999",
  "12345678909"
];
var STRICT_STRIP_REGEX = /[.-]/g;
var LOOSE_STRIP_REGEX = /[^\d]/g;
var verifierDigit = (digits) => {
  const numbers = digits.split("").map((number) => {
    return parseInt(number, 10);
  });
  const modulus = numbers.length + 1;
  const multiplied = numbers.map((number, index) => number * (modulus - index));
  const mod = multiplied.reduce((buffer, number) => buffer + number) % 11;
  return mod < 2 ? 0 : 11 - mod;
};
var strip = (number, strict) => {
  const regex = strict ? STRICT_STRIP_REGEX : LOOSE_STRIP_REGEX;
  return (number || "").replace(regex, "");
};
var format = (number) => {
  return strip(number).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
};
var isValid = (number, strict) => {
  const stripped = strip(number, strict);
  if (!stripped) {
    return false;
  }
  if (stripped.length !== 11) {
    return false;
  }
  if (BLACKLIST.includes(stripped)) {
    return false;
  }
  let numbers = stripped.substr(0, 9);
  numbers += verifierDigit(numbers);
  numbers += verifierDigit(numbers);
  return numbers.substr(-2) === stripped.substr(-2);
};
var generate = (formatted) => {
  let numbers = "";
  for (let i = 0; i < 9; i += 1) {
    numbers += Math.floor(Math.random() * 9);
  }
  numbers += verifierDigit(numbers);
  numbers += verifierDigit(numbers);
  return formatted ? format(numbers) : numbers;
};
var cpf = {
  verifierDigit,
  strip,
  format,
  isValid,
  generate
};

// ui/ts/shared/validators/cpf.ts
function normalizeCpf(raw) {
  return String(raw || "").replace(/\D/g, "");
}
function formatCpf(digits) {
  const v = normalizeCpf(digits);
  if (v.length !== 11) return "";
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}
function isValidCpf(raw) {
  const digits = normalizeCpf(raw);
  return cpf.isValid(digits);
}

// ui/ts/shared/formatters/text.ts
function normalizeText(raw) {
  return String(raw || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

// ui/ts/shared/location/uf.ts
var UF_LIST = /* @__PURE__ */ new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "BR",
  "CE",
  "DF",
  "ES",
  "ET",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
  "IG"
]);
function normalizeUf(raw, opts = {}) {
  const forceIg = !!opts.forceIg;
  const allowIg = opts.allowIg !== false;
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return forceIg ? "IG" : "";
  if (UF_LIST.has(value)) return value;
  if (allowIg && value === "IG") return "IG";
  return forceIg ? "IG" : "";
}

// ui/ts/shared/location/municipio.ts
function normalizeMunicipio(raw) {
  return String(raw || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

// ui/ts/shared/matricula/cnj.ts
function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}
function padLeft(value, size) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return digits.padStart(size, "0").slice(-size);
}
function buildMatriculaBase30(args) {
  const cns = digitsOnly(args.cns6 || "");
  const ano = digitsOnly(args.ano || "");
  const tipoAto = digitsOnly(args.tipoAto || "");
  const acervo = digitsOnly(args.acervo || "01").padStart(2, "0");
  const servico = digitsOnly(args.servico || "55").padStart(2, "0");
  const livro = padLeft(args.livro, 5);
  const folha = padLeft(args.folha, 3);
  const termo = padLeft(args.termo, 7);
  if (cns.length !== 6 || ano.length !== 4 || !tipoAto || !livro || !folha || !termo) return "";
  const base = `${cns}${acervo}${servico}${ano}${tipoAto}${livro}${folha}${termo}`;
  return base.length === 30 ? base : "";
}
function calcDv2Digits(base30) {
  if (!base30 || base30.length !== 30) return "";
  let s1 = 0;
  for (let i = 0; i < 30; i++) s1 += Number(base30[i]) * (31 - i);
  let d1 = 11 - s1 % 11;
  d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
  const seq31 = base30 + String(d1);
  let s2 = 0;
  for (let i = 0; i < 31; i++) s2 += Number(seq31[i]) * (32 - i);
  let d2 = 11 - s2 % 11;
  d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
  return `${d1}${d2}`;
}
function buildMatriculaFinal(args) {
  const base30 = buildMatriculaBase30(args);
  if (!base30) return "";
  const dv = calcDv2Digits(base30);
  return dv ? base30 + dv : "";
}

// ui/ts/acts/obito/mapperHtmlToJson.ts
function getInputValue(name, root = document) {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) return "";
  if (el.tagName === "TEXTAREA") return el.value || "";
  return el.value || "";
}
function getSelectValue(name, root = document) {
  const el = root.querySelector(`select[name="${name}"]`);
  if (!el) return "";
  return el.value || "";
}
function getSelectText(name, root = document) {
  const el = root.querySelector(`select[name="${name}"]`);
  if (!el) return "";
  const opt = el.selectedOptions && el.selectedOptions[0];
  return opt ? opt.textContent.trim() : "";
}
function getCheckboxValue(name, root = document) {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) return false;
  return !!el.checked;
}
function mapSexo(value, label) {
  const map = { M: "masculino", F: "feminino", I: "ignorado", N: "outros" };
  const sexo = map[value] || "";
  const sexoOutros = sexo === "outros" ? normalizeText(label || "") : "";
  return { sexo, sexo_outros: sexoOutros };
}
function mapEstadoCivil(value) {
  const map = {
    SJ: "separado",
    CA: "casado",
    DE: "desquitado",
    DI: "divorciado",
    SO: "solteiro",
    VI: "viuvo",
    IG: "ignorado"
  };
  return map[value] || "";
}
function mapBens(value) {
  if (value === "S") return "sim";
  if (value === "N") return "nao";
  return "ignorada";
}
function normalizeCpfFields(raw) {
  const digits = normalizeCpf(raw);
  if (!digits) return { cpf: "", cpf_sem_inscricao: true };
  if (!isValidCpf(digits)) return { cpf: "", cpf_sem_inscricao: true };
  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}
function buildGenitores(pai, mae) {
  const p = normalizeText(pai);
  const m = normalizeText(mae);
  if (!p && !m) return "";
  return `${p};${m}`;
}
function extractSelo(text) {
  const obs = String(text || "");
  const seloMatch = /SELO[^0-9]*([0-9]+)/i.exec(obs);
  const codMatch = /(COD|CODIGO|CÓDIGO)[^0-9]*([0-9]+)/i.exec(obs);
  return {
    selo: seloMatch ? seloMatch[1] : "",
    cod_selo: codMatch ? codMatch[2] : ""
  };
}
function yearFromDate(value) {
  const normalized = normalizeDate(value);
  const match = (normalized || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : "";
}
function buildMatricula(root) {
  const cns = getInputValue("certidao.cartorio_cns", root);
  const ano = yearFromDate(getInputValue("dataTermo", root));
  const livro = getInputValue("livro", root);
  const folha = getInputValue("folha", root);
  const termo = getInputValue("termo", root);
  return buildMatriculaFinal({
    cns6: cns,
    ano,
    tipoAto: "4",
    acervo: "01",
    servico: "55",
    livro,
    folha,
    termo
  });
}
function parseFilhos(raw) {
  const lines = String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => ({ texto: line }));
}
function parseFilhosEstruturado(raw) {
  const lines = String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const filhos = lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    return {
      nome: normalizeText(parts[0] || ""),
      idade: normalizeText(parts[1] || ""),
      falecido: /^sim|true|1$/i.test(parts[2] || "")
    };
  });
  return {
    quantidade: filhos.length ? String(filhos.length) : "",
    filhos
  };
}
function buildDoc(tipo, numero, data, orgao, uf) {
  const doc = normalizeText(numero);
  if (!doc) return null;
  return {
    tipo,
    documento: doc,
    orgao_emissor: normalizeText(orgao),
    uf_emissao: normalizeUf(uf, { forceIg: true }),
    data_emissao: normalizeDate(data)
  };
}
function mapperHtmlToJson(root = document) {
  const observacao = getInputValue("observacaoCertidao", root);
  const seloInfo = extractSelo(observacao);
  const seloInput = normalizeText(getInputValue("certidao.selo", root));
  const codInput = normalizeText(getInputValue("certidao.cod_selo", root));
  const plataformaId = normalizeText(getInputValue("certidao.plataformaId", root));
  const tipoCertidao = normalizeText(getSelectValue("certidao.tipo_certidao", root));
  const modalidade = normalizeText(getSelectValue("certidao.modalidade", root));
  const cartorioCns = normalizeText(getInputValue("certidao.cartorio_cns", root));
  const cotaEmolumentos = normalizeText(getInputValue("certidao.cota_emolumentos", root));
  const transcricao = getCheckboxValue("certidao.transcricao", root);
  const cpfInfo = normalizeCpfFields(getInputValue("CPFPessoa", root));
  const sexoRaw = getSelectValue("sexo", root);
  const sexoLabel = getSelectText("sexo", root);
  const sexoInfo = mapSexo(sexoRaw, sexoLabel);
  const localTipo = normalizeText(getSelectText("localObito", root));
  const localDesc = normalizeText(getInputValue("descricaoLocalObito", root));
  const localFalecimento = localDesc || localTipo;
  const filhosTexto = getInputValue("descricaoFilhos", root);
  let filhosOpcao = normalizeText(getSelectValue("existenciaFilhosOpcao", root)).toLowerCase();
  if (!filhosOpcao) filhosOpcao = filhosTexto ? "texto" : "";
  let filhosPayload = { filhos: [] };
  if (filhosOpcao === "sim") {
    filhosPayload = parseFilhosEstruturado(filhosTexto);
  } else if (filhosTexto) {
    filhosPayload = { filhos: parseFilhos(filhosTexto) };
  }
  const anotacoes = [];
  const docPrincipal = buildDoc("Outros", getInputValue("documento", root), "", "", "");
  if (docPrincipal) anotacoes.push(docPrincipal);
  const rg = buildDoc("RG", getInputValue("numeroRG", root), getInputValue("dataExpedicaoRG", root), getSelectText("idOrgaoExpedidorRG", root), "IG");
  if (rg) anotacoes.push(rg);
  const pis = buildDoc("PIS", getInputValue("numeroPIS", root), getInputValue("dataExpedicaoPIS", root), getSelectText("idOrgaoExpedidorPIS", root), "IG");
  if (pis) anotacoes.push(pis);
  const passaporte = buildDoc("Passaporte", getInputValue("numeroPassaporte", root), getInputValue("dataExpedicaoPassaporte", root), getSelectText("idOrgaoExpedidorPassaporte", root), "IG");
  if (passaporte) anotacoes.push(passaporte);
  const cns = buildDoc("CNS", getInputValue("numeroCNS", root), getInputValue("dataExpedicaoCNS", root), getSelectText("idOrgaoExpedidorCNS", root), "IG");
  if (cns) anotacoes.push(cns);
  const titulo = buildDoc("TituloEleitor", getInputValue("numeroTitulo", root), "", "", getSelectValue("ufTitulo", root));
  if (titulo) anotacoes.push(titulo);
  const matricula = buildMatricula(root);
  return {
    certidao: {
      plataformaId,
      tipo_registro: "obito",
      tipo_certidao: tipoCertidao,
      transcricao,
      cartorio_cns: cartorioCns,
      selo: seloInput || seloInfo.selo,
      cod_selo: codInput || seloInfo.cod_selo,
      modalidade,
      cota_emolumentos: cotaEmolumentos,
      cota_emolumentos_isento: false
    },
    registro: {
      nome_completo: normalizeText(getInputValue("nomePessoa", root)),
      cpf_sem_inscricao: cpfInfo.cpf_sem_inscricao,
      cpf: cpfInfo.cpf,
      matricula,
      data_falecimento_ignorada: false,
      data_falecimento: normalizeDate(getInputValue("dataObito", root)),
      hora_falecimento: normalizeTime(getInputValue("horaObito", root)),
      local_falecimento: localFalecimento,
      municipio_falecimento: normalizeMunicipio(getInputValue("municipioObito", root)),
      uf_falecimento: normalizeUf(getSelectValue("ufMunicipioObito", root), { forceIg: true }),
      sexo: sexoInfo.sexo,
      sexo_outros: sexoInfo.sexo_outros || "",
      estado_civil: mapEstadoCivil(getSelectValue("estadoCivil", root)),
      nome_ultimo_conjuge_convivente: normalizeText(getInputValue("conjuge", root)),
      idade: normalizeText(getInputValue("idade", root)),
      data_nascimento: normalizeDate(getInputValue("dataNascimento", root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue("cidadeNascimento", root)),
      uf_naturalidade: normalizeUf(getSelectValue("ufNascimento", root), { forceIg: true }),
      filiacao: buildGenitores(getInputValue("nomePai", root), getInputValue("nomeMae", root)),
      causa_morte: normalizeText(getInputValue("causaObito", root)),
      nome_medico: normalizeText(getInputValue("nomeMedico", root)),
      crm_medico: normalizeText(getInputValue("crm", root)),
      local_sepultamento_cremacao: normalizeText(getInputValue("sepultamento", root)),
      municipio_sepultamento_cremacao: normalizeMunicipio(getInputValue("municipioSepultamento", root)),
      uf_sepultamento_cremacao: normalizeUf(getSelectValue("ufMunicipioSepultamento", root), { forceIg: true }),
      data_registro: normalizeDate(getInputValue("dataTermo", root)),
      nome_declarante: normalizeText(getInputValue("declarante", root)),
      existencia_bens: mapBens(getSelectValue("flagBens", root)),
      existencia_filhos_opcao: filhosOpcao,
      existencia_filhos: filhosPayload,
      averbacao_anotacao: normalizeText(observacao),
      anotacoes_cadastro: anotacoes
    }
  };
}

// ui/ts/shared/validators/name.ts
var NAME_RE = /^[A-Za-zÀ-ÿ' -]+$/;
function normalizeName(raw) {
  return String(raw || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}
function validateName(raw, opts = {}) {
  const minWords = opts.minWords || 2;
  const value = normalizeName(raw);
  if (!value) return { value: "", invalid: false, warn: false };
  if (!NAME_RE.test(value)) return { value, invalid: true, warn: false };
  const words = value.split(" ").filter(Boolean);
  const warn = words.length < minWords;
  return { value, invalid: false, warn };
}

// ui/ts/shared/ui/fieldState.ts
function getFieldState(args) {
  const required = !!args.required;
  const value = String(args.value || "").trim();
  const isValid2 = args.isValid !== false;
  const warn = !!args.warn;
  if (!required && !value) return "valid";
  if (required && !value) return "empty";
  if (!isValid2) return "invalid";
  if (warn) return "warn";
  return value ? "valid" : "empty";
}
function applyFieldState(el, state) {
  if (!el) return;
  el.classList.toggle("field--error", state === "empty" || state === "invalid");
  el.classList.toggle("field--empty", state === "empty");
  el.classList.toggle("field--invalid", state === "invalid");
  el.classList.toggle("field--warn", state === "warn");
}

// ui/ts/shared/ui/mask.ts
function digitsOnly2(value) {
  return String(value || "").replace(/\D/g, "");
}
function applyDateMask(input) {
  if (!input) return;
  const digits = digitsOnly2(input.value).slice(0, 8);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += "/" + digits.slice(2, 4);
  else if (digits.length > 2) out += "/" + digits.slice(2);
  if (digits.length >= 5) out += "/" + digits.slice(4, 8);
  input.value = out;
}
function applyTimeMask(input) {
  if (!input) return;
  const digits = digitsOnly2(input.value).slice(0, 4);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length > 2) out += ":" + digits.slice(2, 4);
  input.value = out;
}

// ui/ts/shared/ui/debug.ts
function getFieldLabel(input) {
  var _a, _b, _c, _d, _e;
  const field = ((_a = input == null ? void 0 : input.closest) == null ? void 0 : _a.call(input, ".field")) || ((_b = input == null ? void 0 : input.closest) == null ? void 0 : _b.call(input, ".campo"));
  if (!field) return ((_c = input == null ? void 0 : input.getAttribute) == null ? void 0 : _c.call(input, "data-bind")) || (input == null ? void 0 : input.name) || (input == null ? void 0 : input.id) || "";
  const label = field.querySelector("label");
  const text = (_d = label == null ? void 0 : label.textContent) == null ? void 0 : _d.trim();
  return text || ((_e = input == null ? void 0 : input.getAttribute) == null ? void 0 : _e.call(input, "data-bind")) || (input == null ? void 0 : input.name) || (input == null ? void 0 : input.id) || "";
}
function collectInvalidFields(root = document) {
  const items = /* @__PURE__ */ new Set();
  root.querySelectorAll(".invalid").forEach((el) => {
    const label = getFieldLabel(el);
    if (label) items.add(label);
  });
  root.querySelectorAll(".field.field--error, .campo.field--error").forEach((field) => {
    var _a, _b;
    const label = (_b = (_a = field.querySelector("label")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim();
    if (label) items.add(label);
  });
  return Array.from(items);
}

// ui/ts/shared/productivity/index.ts
function setupPrimaryShortcut(getPrimary) {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      const target = typeof getPrimary === "function" ? getPrimary() : null;
      target == null ? void 0 : target.click();
    }
  });
}

// ui/ts/shared/ui/admin.ts
var SIGNERS_KEY = "ui.admin.signers";
function loadSigners() {
  try {
    const raw = localStorage.getItem(SIGNERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  } catch {
    return [];
  }
}
function saveSigners(list) {
  localStorage.setItem(SIGNERS_KEY, JSON.stringify(list));
}
function buildSignerOption(name) {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  opt.dataset.localSigner = "1";
  return opt;
}
function syncSignerSelects(signers) {
  const selects = document.querySelectorAll('select[data-signer-select], select[name="idAssinante"]');
  selects.forEach((select) => {
    Array.from(select.options).forEach((opt) => {
      if (opt.dataset && opt.dataset.localSigner === "1") opt.remove();
    });
    signers.forEach((name) => {
      const exists = Array.from(select.options).some((opt) => opt.value === name);
      if (!exists) select.appendChild(buildSignerOption(name));
    });
  });
}
function renderList(container, signers) {
  if (!container) return;
  container.innerHTML = "";
  if (!signers.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Nenhum assinante cadastrado.";
    container.appendChild(empty);
    return;
  }
  signers.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    const label = document.createElement("span");
    label.textContent = name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn tiny secondary";
    remove.textContent = "Remover";
    remove.addEventListener("click", () => {
      const next = loadSigners().filter((item) => item !== name);
      saveSigners(next);
      renderList(container, next);
      syncSignerSelects(next);
    });
    row.appendChild(label);
    row.appendChild(remove);
    container.appendChild(row);
  });
}
function setupAdminPanel() {
  const input = document.getElementById("admin-signer-name");
  const addBtn = document.getElementById("admin-signer-add");
  const list = document.getElementById("admin-signer-list");
  if (!input || !addBtn || !list) {
    syncSignerSelects(loadSigners());
    return;
  }
  const render = () => {
    const signers = loadSigners();
    renderList(list, signers);
    syncSignerSelects(signers);
  };
  addBtn.addEventListener("click", () => {
    const value = String(input.value || "").trim();
    if (!value) return;
    const signers = loadSigners();
    if (!signers.includes(value)) {
      signers.push(value);
      saveSigners(signers);
    }
    input.value = "";
    render();
  });
  render();
}
function setupEditableDefaults() {
  document.querySelectorAll("[data-default]").forEach((el) => {
    const input = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement ? el : null;
    if (!input) return;
    const def = String(input.getAttribute("data-default") || "").trim();
    if (!input.value) {
      input.value = def;
      input.classList.add("input-locked");
      input.setAttribute("data-locked", "1");
    }
    input.addEventListener("click", () => {
      if (input.getAttribute("data-locked") === "1") {
        input.removeAttribute("data-locked");
        input.classList.add("editing");
        input.classList.remove("input-locked");
        input.focus();
      }
    });
    input.addEventListener("blur", () => {
      if (!String(input.value || "").trim()) {
        input.value = def;
        input.setAttribute("data-locked", "1");
        input.classList.remove("editing");
        input.classList.add("input-locked");
      }
    });
  });
}
try {
  setTimeout(() => setupEditableDefaults(), 50);
} catch (e) {
}

// ui/ts/nameValidator.ts
var import_papaparse = __toESM(require_papaparse_min());

// ui/ts/placeAutofill/normalize.ts
function stripAccents(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ui/ts/nameValidator.ts
var DEFAULT_NAMES = [
  "ana",
  "antonio",
  "beatriz",
  "bruno",
  "carlos",
  "carla",
  "cassio",
  "celia",
  "daniel",
  "elisa",
  "fernanda",
  "gabriel",
  "helena",
  "joao",
  "jose",
  "juliana",
  "larissa",
  "lucas",
  "luiz",
  "maria",
  "marcos",
  "patricia",
  "paulo",
  "rafael",
  "roberto",
  "silvia",
  "thiago"
];
var NAME_PARTICLES = /* @__PURE__ */ new Set(["da", "de", "do", "das", "dos", "e"]);
function normalizeName2(value) {
  return stripAccents(String(value || "")).toLowerCase().replace(/[^a-z\s]+/g, " ").replace(/\s+/g, " ").trim();
}
function tokenizeName(value) {
  return normalizeName2(value).split(" ").map((t) => t.trim()).filter((t) => t && !NAME_PARTICLES.has(t));
}
function levenshtein(a, b) {
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
  for (let i = 0; i <= alen; i++) dp[i][0] = i;
  for (let j = 0; j <= blen; j++) dp[0][j] = j;
  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[alen][blen];
}
function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}
async function fetchCsvText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao baixar: ${path}`);
  if (path.endsWith(".gz")) {
    if (!res.body || typeof DecompressionStream === "undefined") {
      throw new Error("Descompressao gzip indisponivel");
    }
    const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  return await res.text();
}
async function loadCsvData() {
  let nomesText = "";
  let gruposText = "";
  const nomesPaths = ["/data/nomes.csv.gz", "/public/data/nomes.csv.gz", "/data/nomes.csv", "/public/data/nomes.csv"];
  const gruposPaths = ["/data/grupos.csv.gz", "/public/data/grupos.csv.gz", "/data/grupos.csv", "/public/data/grupos.csv"];
  for (const p of nomesPaths) {
    try {
      nomesText = await fetchCsvText(p);
      break;
    } catch (e) {
    }
  }
  for (const p of gruposPaths) {
    try {
      gruposText = await fetchCsvText(p);
      break;
    } catch (e) {
    }
  }
  const nomes = import_papaparse.default.parse(nomesText, { header: true, skipEmptyLines: true }).data || [];
  const grupos = import_papaparse.default.parse(gruposText, { header: true, skipEmptyLines: true }).data || [];
  return { nomes, grupos };
}
function splitPipeList(value) {
  return String(value || "").split("|").map((t) => t.trim()).filter(Boolean);
}
function buildNameList(data) {
  const set = /* @__PURE__ */ new Set();
  data.nomes.forEach((row) => {
    if (row.first_name) set.add(row.first_name);
    if (row.group_name) set.add(row.group_name);
    splitPipeList(row.alternative_names).forEach((n) => set.add(n));
  });
  data.grupos.forEach((row) => {
    if (row.name) set.add(row.name);
    splitPipeList(row.names).forEach((n) => set.add(n));
  });
  return Array.from(set).map((n) => normalizeName2(n)).filter(Boolean);
}
var NameDictionaryRepository = class {
  constructor(opts = {}) {
    this.storageKey = opts.storageKey || "certidao.nameDictionary.v1";
  }
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { schemaVersion: 1, entries: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) {
        return { schemaVersion: 1, entries: [] };
      }
      return parsed;
    } catch {
      return { schemaVersion: 1, entries: [] };
    }
  }
  save(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
  addException(value) {
    const normalized = normalizeName2(value);
    if (!normalized) return;
    const data = this.load();
    if (data.entries.find((e) => e.normalized === normalized)) return;
    data.entries.push({
      value,
      normalized,
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "user"
    });
    this.save(data);
  }
  has(value) {
    const normalized = normalizeName2(value);
    if (!normalized) return false;
    const data = this.load();
    return data.entries.some((e) => e.normalized === normalized);
  }
  list() {
    return this.load().entries || [];
  }
};
function createNameValidator(opts = {}) {
  const threshold = opts.threshold || 0.82;
  const minLength = opts.minLength || 3;
  const repo = opts.repo || new NameDictionaryRepository();
  let base = (opts.baseNames || DEFAULT_NAMES).map((n) => normalizeName2(n)).filter(Boolean);
  let ready = false;
  const readyPromise = loadCsvData().then((data) => {
    base = buildNameList(data);
    ready = true;
  }).catch(() => {
    ready = false;
  });
  function isReady() {
    return ready;
  }
  function isKnown(token) {
    if (!token) return false;
    if (base.includes(token)) return true;
    if (repo.has(token)) return true;
    return false;
  }
  function bestScore(token) {
    let best = 0;
    for (const name of base) {
      const score = similarity(token, name);
      if (score > best) best = score;
    }
    return best;
  }
  function check(value) {
    const tokens = tokenizeName(value);
    if (!tokens.length) return { suspicious: false, token: "" };
    let unknown = 0;
    let known = 0;
    let firstUnknown = "";
    for (const token of tokens) {
      if (token.length < minLength) continue;
      if (isKnown(token)) {
        known += 1;
        continue;
      }
      unknown += 1;
      if (!firstUnknown) firstUnknown = token;
    }
    if (unknown === 0) return { suspicious: false, token: "" };
    if (tokens.length === 1) {
      const token = firstUnknown || tokens[0];
      const score = bestScore(token);
      let effectiveThreshold = threshold;
      if (token.length <= 3) effectiveThreshold = 0.55;
      else if (token.length <= 5) effectiveThreshold = 0.7;
      else if (token.length <= 7) effectiveThreshold = 0.78;
      if (score < effectiveThreshold) return { suspicious: true, token };
      return { suspicious: false, token: "" };
    }
    if (known === 0) return { suspicious: true, token: firstUnknown };
    if (unknown >= 3) return { suspicious: true, token: firstUnknown };
    return { suspicious: false, token: "" };
  }
  return { check, repo, normalizeName: normalizeName2, ready: readyPromise, isReady };
}

// ui/ts/acts/obito/printTemplate.ts
var MONTHS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO"
];
var MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
var UNITS = ["ZERO", "UM", "DOIS", "TRES", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
var TEENS = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
var TENS = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
var HUNDREDS = ["", "CEM", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
function pad23(value) {
  return String(value).padStart(2, "0");
}
function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}
function fallback(value, alt = "N\xC3O CONSTA") {
  const v = String(value || "").trim();
  return v ? v : alt;
}
function ufDisplay(value) {
  const uf = normalizeUpper(value);
  if (!uf || uf === "IG") return "N/C";
  return uf;
}
function numberToWords(n) {
  if (n === 0) return UNITS[0];
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u ? `${TENS[t]} E ${UNITS[u]}` : TENS[t];
  }
  if (n < 1e3) {
    if (n === 100) return "CEM";
    const h = Math.floor(n / 100);
    const rest2 = n % 100;
    const hword = h === 1 ? "CENTO" : HUNDREDS[h];
    return rest2 ? `${hword} E ${numberToWords(rest2)}` : hword;
  }
  if (n < 2e3) {
    const rest2 = n - 1e3;
    return rest2 ? `MIL E ${numberToWords(rest2)}` : "MIL";
  }
  const thousands = Math.floor(n / 1e3);
  const rest = n % 1e3;
  const tword = `${numberToWords(thousands)} MIL`;
  return rest ? `${tword} E ${numberToWords(rest)}` : tword;
}
function dateParts(value) {
  const normalized = normalizeDate(value);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized || "");
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}
function buildDateExtenso(dateStr, timeStr) {
  const parts = dateParts(dateStr);
  if (!parts) return "N\xC3O CONSTA";
  const day = numberToWords(parts.day);
  const month = MONTHS[parts.month - 1] || "";
  const year = numberToWords(parts.year);
  const time = normalizeTime(timeStr);
  const hora = time ? ` \xC0S ${time}` : "";
  return `${day} DO M\xCAS DE ${month} DO ANO DE ${year}${hora}`;
}
function formatDatePieces(dateStr) {
  const parts = dateParts(dateStr);
  if (!parts) {
    return { day: "N/C", month: "N/C", year: "N/C" };
  }
  return {
    day: pad23(parts.day),
    month: pad23(parts.month),
    year: String(parts.year)
  };
}
function formatIssueDate(date = /* @__PURE__ */ new Date()) {
  const day = date.getDate();
  const month = MONTHS_LONG[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}
function formatMatricula(matricula) {
  const digits = String(matricula || "").replace(/\D/g, "");
  if (digits.length < 32) return fallback(matricula, "N\xC3O CONSTA");
  const cns = digits.slice(0, 6);
  const acervo = digits.slice(6, 8);
  const servico = digits.slice(8, 10);
  const ano = digits.slice(10, 14);
  const tipo = digits.slice(14, 15);
  const livro = digits.slice(15, 20);
  const folha = digits.slice(20, 23);
  const termo = digits.slice(23, 30);
  const dv = digits.slice(30, 32);
  return `${cns} ${acervo} ${servico} ${ano} ${tipo} ${livro} ${folha} ${termo}  - ${dv}`;
}
function formatFilhos(registro) {
  var _a;
  const opcao = String((registro == null ? void 0 : registro.existencia_filhos_opcao) || "").toLowerCase();
  const filhos = ((_a = registro == null ? void 0 : registro.existencia_filhos) == null ? void 0 : _a.filhos) || [];
  if (opcao === "texto") {
    const texto = filhos.map((f) => f.texto).filter(Boolean).join("; ");
    return texto ? texto : "N\xC3O CONSTA";
  }
  if (opcao === "sim") {
    if (!filhos.length) return "SIM";
    const items = filhos.map((f) => {
      const nome = normalizeUpper(f.nome || "");
      const idade = f.idade ? ` (${normalizeUpper(f.idade)})` : "";
      const falecido = f.falecido ? " FALECIDO" : "";
      return `${nome}${idade}${falecido}`.trim();
    }).filter(Boolean);
    return items.length ? items.join("; ") : "SIM";
  }
  return "N\xC3O CONSTA";
}
function formatAnotacoes(anotacoes) {
  if (!anotacoes || !anotacoes.length) return "N\xC3O CONSTA";
  return anotacoes.map((item) => {
    const tipo = normalizeUpper(item.tipo);
    const doc = normalizeUpper(item.documento);
    return `${tipo}: ${doc}`;
  }).join(" | ");
}
function formatBens(value) {
  const v = normalizeUpper(value);
  if (!v || v === "IGNORADA") return "N\xC3O CONSTA";
  if (v === "NAO") return "NAO";
  return v;
}
function buildObitoPrintHtml(data, opts = {}) {
  const registro = (data == null ? void 0 : data.registro) || {};
  const certidao = (data == null ? void 0 : data.certidao) || {};
  const now = /* @__PURE__ */ new Date();
  const cidadeCartorio = normalizeUpper(opts.cidadeCartorio || registro.municipio_falecimento || "");
  const ufCartorio = ufDisplay(opts.ufCartorio || registro.uf_falecimento || "");
  const assinante = normalizeUpper(opts.assinante || "");
  const enderecoCartorio = normalizeUpper(opts.enderecoCartorio || "");
  const telefoneCartorio = normalizeUpper(opts.telefoneCartorio || "");
  const dataFalecimentoExt = buildDateExtenso(registro.data_falecimento, registro.hora_falecimento);
  const dataFalecimentoParts = formatDatePieces(registro.data_falecimento);
  const dataRegistroExt = buildDateExtenso(registro.data_registro, registro.hora_falecimento);
  const dataRegistroParts = formatDatePieces(registro.data_registro);
  const sexo = normalizeUpper(registro.sexo === "outros" ? registro.sexo_outros || "OUTROS" : registro.sexo);
  const estadoCivil = normalizeUpper(registro.estado_civil);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Certidao de Obito</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; }
    .label { font-size: 9pt; color: #333; }
    .tabela { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .novodado { font-size: 10pt; font-weight: bold; padding: 4px 2px; }
    .novomodelo { font-size: 10pt; padding: 4px 2px; }
    fieldset { border: 1px solid #cbd5e1; padding: 4px 8px; min-height: 40px; }
    legend { padding: 0 6px; }
    .rodape { width: 100%; margin-top: 10px; }
    .rodape-esquerdo { font-size: 9pt; vertical-align: top; width: 40%; }
    .rodape-direito { width: 40%; }
    .via { font-size: 12pt; font-weight: bold; }
    .tabelafinal { width: 100%; }
  </style>
</head>
<body>
<center>
  <img src="http://www.tjse.jus.br/scc/resources/imagens/brasao_exercito.jpg"><br>
  REPUBLICA FEDERATIVA DO BRASIL<br>
  REGISTRO CIVIL DAS PESSOAS NATURAIS<br>
  <br>
  <input type="hidden" name="moeda" value="">
  <br><span style="font-size: 13pt; color: gray">CERTIDAO DE OBITO</span><br>
  <br> <span class="label">NOME&nbsp;</span><br>
  <span style="font-size: 10pt; font-weight: bold">${fallback(normalizeUpper(registro.nome_completo))}</span><br>
  <div style="width: 80%">
    <table class="tabela">
      <tr>
        <td class="label" width="30%">CPF</td>
      </tr>
      <tr>
        <td class="novodado" width="30%">${fallback(normalizeUpper(registro.cpf))}</td>
      </tr>
    </table>
    <b>MATRICULA</b>
    <div style="font-size: 15px"><b>${formatMatricula(registro.matricula)}</b></div>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Data do falecimento</legend>
            <div class="novomodelo">${dataFalecimentoExt}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">${dataFalecimentoParts.day}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">${dataFalecimentoParts.month}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">${dataFalecimentoParts.year}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Horario do falecimento</legend>
            <div class="novomodelo">${fallback(normalizeTime(registro.hora_falecimento), "N/C")} hora(s)</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Local de falecimento</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.local_falecimento))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio de falecimento</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_falecimento))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_falecimento)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Sexo</legend>
            <div class="novomodelo">${fallback(sexo)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Estado Civil</legend>
            <div class="novomodelo">${fallback(estadoCivil)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Nome do ultimo conjuge ou convivente</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.nome_ultimo_conjuge_convivente))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Idade</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.idade), "N/C")}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">N/C</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio de naturalidade</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_naturalidade))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_naturalidade)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do(a)s Genitor(es)</legend>
            <div class="novomodelo">&nbsp;${fallback(normalizeUpper(registro.filiacao))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Causa da morte</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.causa_morte))}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do medico que atestou o obito ou, se for o caso, das testemunhas</legend>
            <div class="novomodelo">&nbsp;${normalizeUpper(registro.nome_medico)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Numero do documento</legend>
            <div class="novomodelo">${normalizeUpper(registro.crm_medico)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Local de sepultamento / Cremacao</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.local_sepultamento_cremacao))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Municipio</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.municipio_sepultamento_cremacao))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">UF</legend>
            <div class="novomodelo">${ufDisplay(registro.uf_sepultamento_cremacao)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Data de registro</legend>
            <div class="novomodelo">${dataRegistroExt}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Dia</legend>
            <div class="novomodelo">${dataRegistroParts.day}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Mes</legend>
            <div class="novomodelo">${dataRegistroParts.month}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Ano</legend>
            <div class="novomodelo">${dataRegistroParts.year}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Nome do Declarante</legend>
            <div class="novomodelo">${fallback(normalizeUpper(registro.nome_declarante))}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Existencia de bens</legend>
            <div class="novomodelo">${formatBens(registro.existencia_bens)}</div>
          </fieldset>
        </td>
        <td>
          <fieldset>
            <legend class="label">Existencia de filhos</legend>
            <div class="novomodelo">${formatFilhos(registro)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table class="tabela">
      <tr>
        <td>
          <fieldset>
            <legend class="label">Anotacoes voluntarias de cadastro</legend>
            <div class="novomodelo" style="font-size: 95% !important">${formatAnotacoes(registro.anotacoes_cadastro)}</div>
          </fieldset>
        </td>
      </tr>
    </table>

    <table border="0" class="rodape">
      <tr>
        <td class="rodape-esquerdo">
          <div>
            <div>CNS n\xBA ${fallback(certidao.cartorio_cns)}</div>
            <div>Oficial de Registro Civil de Pessoas Naturais</div>
            <div>${cidadeCartorio}${ufCartorio && cidadeCartorio ? "-" : ""}${ufCartorio}</div>
            <br>
            <div>${assinante || "ESCREVENTE"}</div>
            <div>ESCREVENTE</div>
            <br>
            <div>${enderecoCartorio}</div>
            <div>${cidadeCartorio}${ufCartorio && cidadeCartorio ? " - " : ""}${ufCartorio}</div>
            <div>${telefoneCartorio}</div>
          </div>
        </td>
        <td><span class="via">2\xAA VIA</span></td>
        <td class="rodape-direito">
          <table class="tabelafinal">
            <tr>
              <td style="text-align: center">O conteudo da certidao e verdadeiro. Dou fe. <br>
                ${cidadeCartorio}, ${ufCartorio}, ${formatIssueDate(now)}. <br>
                <br><span style="font-family:verdana !important;"> _______________________________________________________</span><br>
                Assinatura do Oficial
              </td>
            </tr>
            <tr>
              <td style="text-align: center"> </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <br><br>
  </div>
</center>
</body>
</html>`;
  return html;
}

// ui/ts/acts/obito/obito.ts
var NAME_MODE_KEY = "ui.nameValidationMode";
var nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || "input";
var DRAWER_POS_KEY = "ui.drawerPosition";
var ENABLE_CPF_KEY = "ui.enableCpfValidation";
var ENABLE_NAME_KEY = "ui.enableNameValidation";
var PANEL_INLINE_KEY = "ui.panelInline";
function applyDrawerPosition(pos) {
  const drawer = document.getElementById("drawer");
  if (!drawer) return;
  drawer.classList.remove("position-top", "position-bottom-right", "position-side");
  if (pos === "top") drawer.classList.add("position-top");
  else if (pos === "side") drawer.classList.add("position-side");
  else drawer.classList.add("position-bottom-right");
}
function setStatus(text, isError) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#dc2626" : "#64748b";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = "Pronto";
    el.style.color = "#64748b";
  }, 2e3);
}
function formatCpfInput(value) {
  const digits = normalizeCpf(value).slice(0, 11);
  if (!digits) return "";
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}
function escapeXml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function toXml(obj, nodeName, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === void 0) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== "object") return `${pad}<${nodeName}>${escapeXml(obj)}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml(item, nodeName, indent)).join("\n");
  const children = Object.keys(obj).map((key) => toXml(obj[key], key, indent + 1)).join("\n");
  return `${pad}<${nodeName}>
${children}
${pad}</${nodeName}>`;
}
function downloadFile(name, content, mime) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
function makeTimestamp() {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function normalizeFilePart(value, fallback2) {
  const clean = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return clean || fallback2;
}
function buildFileName(data, ext) {
  var _a, _b;
  const nome = normalizeFilePart((_a = data == null ? void 0 : data.registro) == null ? void 0 : _a.nome_completo, "SEM_NOME");
  const cpfDigits = String(((_b = data == null ? void 0 : data.registro) == null ? void 0 : _b.cpf) || "").replace(/\D/g, "");
  const cpfPart = cpfDigits ? cpfDigits : "SEM_CPF";
  const stamp = makeTimestamp();
  return `OBITO_${nome}_${cpfPart}_${stamp}.${ext}`;
}
function generateJson() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const out = document.getElementById("json-output");
  if (out) out.value = json;
  const name = buildFileName(data, "json");
  if (downloadFile(name, json, "application/json")) setStatus(`JSON baixado: ${name}`);
  else setStatus("Falha ao gerar JSON", true);
}
function generateXml() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const xml = toXml(data, "certidao_obito", 0);
  const out = document.getElementById("xml-output");
  if (out) out.value = xml;
  const name = buildFileName(data, "xml");
  if (downloadFile(name, xml, "application/xml")) setStatus(`XML baixado: ${name}`);
  else setStatus("Falha ao gerar XML", true);
}
function openPrintPreview() {
  var _a, _b, _c, _d;
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const assinante = ((_a = document.querySelector('select[name="idAssinante"] option:checked')) == null ? void 0 : _a.textContent) || "";
  const tituloLivro = ((_b = document.querySelector('input[name="tituloLivro"]')) == null ? void 0 : _b.value) || "";
  const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
  const cidadeCartorio = (cidadeMatch ? cidadeMatch[1] : "") || ((_c = document.querySelector('input[name="municipioObito"]')) == null ? void 0 : _c.value) || "";
  const ufCartorio = ((_d = document.querySelector('select[name="ufMunicipioObito"]')) == null ? void 0 : _d.value) || "";
  const html = buildObitoPrintHtml(data, {
    assinante: assinante.trim(),
    cidadeCartorio: cidadeCartorio.trim(),
    ufCartorio
  });
  const out = document.getElementById("print-html");
  if (out) out.value = html;
  const win = window.open("", "_blank");
  if (!win) {
    setStatus("Popup bloqueado. Libere para imprimir.", true);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 2e3);
}
function setupConfigPanel() {
  var _a;
  const radios = document.querySelectorAll('input[name="name-validation-mode"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === nameValidationMode;
  });
  (_a = document.getElementById("config-save")) == null ? void 0 : _a.addEventListener("click", () => {
    const selected = document.querySelector('input[name="name-validation-mode"]:checked');
    if (selected && selected.value) {
      nameValidationMode = selected.value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
  });
}
function setupSettingsPanel() {
  const select = document.getElementById("settings-drawer-position");
  const cbCpf = document.getElementById("settings-enable-cpf");
  const cbName = document.getElementById("settings-enable-name");
  const saveBtn = document.getElementById("settings-save");
  const applyBtn = document.getElementById("settings-apply");
  const pos = localStorage.getItem(DRAWER_POS_KEY) || "bottom-right";
  const enableCpf = localStorage.getItem(ENABLE_CPF_KEY) !== "false";
  const enableName = localStorage.getItem(ENABLE_NAME_KEY) !== "false";
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const panelInline = panelInlineStored === null ? false : panelInlineStored === "true";
  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  const cbInline = document.getElementById("settings-panel-inline");
  if (cbInline) cbInline.checked = !!panelInline;
  applyDrawerPosition(pos);
  saveBtn == null ? void 0 : saveBtn.addEventListener("click", () => {
    var _a;
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    const newCpf = (cbCpf == null ? void 0 : cbCpf.checked) ? "true" : "false";
    const newName = (cbName == null ? void 0 : cbName.checked) ? "true" : "false";
    const newInline = ((_a = document.getElementById("settings-panel-inline")) == null ? void 0 : _a.checked) ? "true" : "false";
    localStorage.setItem(DRAWER_POS_KEY, newPos);
    localStorage.setItem(ENABLE_CPF_KEY, newCpf);
    localStorage.setItem(ENABLE_NAME_KEY, newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    applyDrawerPosition(newPos);
    setStatus("Prefer\xEAncias salvas. Atualizando...", false);
    setTimeout(() => window.location.reload(), 300);
  });
  applyBtn == null ? void 0 : applyBtn.addEventListener("click", () => {
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    applyDrawerPosition(newPos);
    setStatus("Posi\xE7\xE3o aplicada (n\xE3o salva)", false);
  });
}
function ensureDrawer() {
  let drawer = document.getElementById("drawer");
  if (drawer) return drawer;
  drawer = document.createElement("div");
  drawer.id = "drawer";
  drawer.className = "drawer";
  const header = document.createElement("div");
  header.className = "drawer-header";
  const title = document.createElement("div");
  title.className = "drawer-title";
  title.textContent = "Painel";
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn secondary";
  closeBtn.textContent = "Fechar";
  closeBtn.addEventListener("click", () => drawer.classList.remove("open"));
  header.appendChild(title);
  header.appendChild(closeBtn);
  const body = document.createElement("div");
  body.className = "drawer-body";
  const tabbar = document.createElement("div");
  tabbar.className = "tabbar";
  const makeTabBtn = (label, tab) => {
    const b = document.createElement("button");
    b.className = "tab-btn";
    b.setAttribute("data-tab", tab);
    b.textContent = label;
    return b;
  };
  const btnConfig = makeTabBtn("Configuracoes", "tab-config");
  btnConfig.classList.add("active");
  const btnJson = makeTabBtn("JSON", "tab-json");
  const btnXml = makeTabBtn("XML", "tab-xml");
  const btnDebug = makeTabBtn("Debug", "tab-debug");
  tabbar.appendChild(btnConfig);
  tabbar.appendChild(btnJson);
  tabbar.appendChild(btnXml);
  tabbar.appendChild(btnDebug);
  const paneConfig = document.createElement("div");
  paneConfig.id = "tab-config";
  paneConfig.className = "tab-pane active";
  const paneJson = document.createElement("div");
  paneJson.id = "tab-json";
  paneJson.className = "tab-pane";
  const paneXml = document.createElement("div");
  paneXml.id = "tab-xml";
  paneXml.className = "tab-pane";
  const paneDebug = document.createElement("div");
  paneDebug.id = "tab-debug";
  paneDebug.className = "tab-pane";
  body.appendChild(tabbar);
  body.appendChild(paneConfig);
  body.appendChild(paneJson);
  body.appendChild(paneXml);
  body.appendChild(paneDebug);
  tabbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    const tab = btn.getAttribute("data-tab");
    tabbar.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    [paneConfig, paneJson, paneXml, paneDebug].forEach((p) => p.classList.remove("active"));
    const target = body.querySelector(`#${tab}`);
    if (target) target.classList.add("active");
  });
  drawer.appendChild(header);
  drawer.appendChild(body);
  document.body.appendChild(drawer);
  return drawer;
}
function arrangePanel() {
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  const useInline = panelInlineStored === null ? false : panelInlineStored === "true";
  const inline = document.getElementById("panel-inline");
  if (!inline) return;
  const drawerPos = localStorage.getItem(DRAWER_POS_KEY) || "bottom-right";
  const existingDrawer = document.getElementById("drawer");
  if (useInline) {
    if (existingDrawer) {
      const body = existingDrawer.querySelector(".drawer-body");
      if (body) {
        while (body.firstChild) inline.appendChild(body.firstChild);
      }
      existingDrawer.remove();
    }
    const toggle = document.getElementById("drawer-toggle");
    if (toggle) toggle.style.display = "none";
  } else {
    const drawer = ensureDrawer();
    applyDrawerPosition(drawerPos);
    const body = drawer.querySelector(".drawer-body");
    if (body) {
      const paneConfig = body.querySelector("#tab-config");
      const paneJson = body.querySelector("#tab-json");
      const paneXml = body.querySelector("#tab-xml");
      const paneDebug = body.querySelector("#tab-debug");
      while (inline.firstChild) {
        const node = inline.firstChild;
        const hasJson = node.querySelector && node.querySelector("#json-output");
        const hasXml = node.querySelector && node.querySelector("#xml-output");
        const hasPrint = node.querySelector && node.querySelector("#print-html");
        const hasDebug = node.querySelector && (node.querySelector("#debug-invalid") || node.querySelector("#debug-alerts") || node.querySelector("#debug-matricula-base"));
        if (hasJson && paneJson) paneJson.appendChild(node);
        else if (hasXml && paneXml) paneXml.appendChild(node);
        else if (hasPrint && paneXml) paneXml.appendChild(node);
        else if (hasDebug && paneDebug) paneDebug.appendChild(node);
        else if (paneConfig) paneConfig.appendChild(node);
        else body.appendChild(node);
      }
    }
    const toggle = document.getElementById("drawer-toggle");
    if (toggle) toggle.style.display = "inline-flex";
  }
}
function setupDrawerToggle() {
  const btn = document.getElementById("drawer-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const drawer = document.getElementById("drawer");
    if (!drawer) return;
    drawer.classList.toggle("open");
  });
}
function setupActSelect() {
  const select = document.getElementById("ato-select");
  if (!select) return;
  select.value = "obito";
  select.addEventListener("change", () => {
    const map = {
      nascimento: "./Nascimento2Via.html",
      casamento: "./Casamento2Via.html",
      obito: "./Obito2Via.html"
    };
    const next = map[select.value];
    if (next) window.location.href = next;
  });
}
function populateOrgaoAndUf() {
  const orgaos = [
    ["", ""],
    ["7", "CONSELHO REGIONAL DE ADMINISTRACAO"],
    ["8", "CONSELHO REGIONAL DE ASSISTENCIA SOCIAL"],
    ["9", "CONSELHO REGIONAL DE BIBLIOTECONOMIA"],
    ["28", "CONSELHO REGIONAL DE BIOLOGIA"],
    ["10", "CONSELHO REGIONAL DE CONTABILIDADE"],
    ["11", "CONSELHO REGIONAL DE CORRETORES IMOVEIS"],
    ["12", "CONSELHO REGIONAL DE ECONOMIA"],
    ["13", "CONSELHO REGIONAL DE ENFERMAGEM"],
    ["14", "CONSELHO REGIONAL DE ENGENHARIA E ARQUITETURA"],
    ["15", "CONSELHO REGIONAL DE ESTATISTICA"],
    ["16", "CONSELHO REGIONAL DE FARMACIA"],
    ["17", "CONSELHO REGIONAL DE FISIOTERAPIA E TERAPIA"],
    ["29", "CONSELHO REGIONAL DE FONAUDIOLOGIA"],
    ["18", "CONSELHO REGIONAL DE MEDICINA"],
    ["19", "CONSELHO REGIONAL DE MEDICINA VETERIN\xC1RIA"],
    ["21", "CONSELHO REGIONAL DE NUTRICAO"],
    ["22", "CONSELHO REGIONAL DE ODONTOLOGIA"],
    ["24", "CONSELHO REGIONAL DE PSICOLOGIA"],
    ["25", "CONSELHO REGIONAL DE QUIMICA"],
    ["23", "CONSELHO REGIONAL DE RELACOES PUBLICAS"],
    ["30", "CONSELHO REGIONAL DE SERVICO SOCIAL"],
    ["31", "CONSELHO REGIONAL DE TECNICOS EM RADIOLOGIA"],
    ["26", "CONSELHO REGIONAL DOS ESCRITORES"],
    ["34", "CORPO DE BOMBEIROS"],
    ["32", "DEPARTAMENTO ESTADUAL DE TRANSITO"],
    ["4", "MINISTERIO DA AERONATICA"],
    ["3", "MINISTERIO DA DEFESA"],
    ["5", "MINISTERIO DA MARINHA"],
    ["1", "NAO INFORMADO"],
    ["27", "ORDEM DOS ADVOGADOS DO BRASIL"],
    ["20", "ORDEM DOS MUSICOS DO BRASIL"],
    ["36", "POLICIA CIVIL"],
    ["6", "POLICIA FEDERAL"],
    ["33", "POLICIA MILITAR"],
    ["38", "SECRETARIA DE DEFESA SOCIAL"],
    ["37", "SECRETARIA DE ESTADO DA DEFESA SOCIAL/AL"],
    ["2", "SECRETARIA DE SEGURANCA PUBLICA"],
    ["35", "SECRETARIA DO ESTADO DA CASA CIVIL"]
  ];
  const orgIds = ["orgaoExpedidorRG", "orgaoExpedidorPIS", "orgaoExpedidorPassaporte", "orgaoExpedidorCNS"];
  orgIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    orgaos.forEach((pair) => {
      const o = document.createElement("option");
      o.value = pair[0];
      o.textContent = pair[1];
      el.appendChild(o);
    });
  });
  const ufSelect = document.getElementById("ufTitulo");
  if (ufSelect) {
    ufSelect.innerHTML = "";
    const ufs = ["", "AC", "AL", "AP", "AM", "BA", "BR", "CE", "DF", "ES", "ET", "GO", "IG", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    ufs.forEach((u) => {
      const o = document.createElement("option");
      o.value = u;
      o.textContent = u;
      ufSelect.appendChild(o);
    });
  }
}
function yearFromDate2(value) {
  const normalized = normalizeDate(value);
  const match = (normalized || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : "";
}
function updateDebug(data) {
  var _a, _b, _c, _d, _e;
  const cns = ((_a = document.querySelector('input[name="certidao.cartorio_cns"]')) == null ? void 0 : _a.value) || "";
  const ano = yearFromDate2(((_b = document.querySelector('input[name="dataTermo"]')) == null ? void 0 : _b.value) || "");
  const livro = ((_c = document.querySelector('input[name="livro"]')) == null ? void 0 : _c.value) || "";
  const folha = ((_d = document.querySelector('input[name="folha"]')) == null ? void 0 : _d.value) || "";
  const termo = ((_e = document.querySelector('input[name="termo"]')) == null ? void 0 : _e.value) || "";
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto: "4",
    acervo: "01",
    servico: "55",
    livro,
    folha,
    termo
  });
  const dv = base ? calcDv2Digits(base) : "";
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto: "4", livro, folha, termo });
  const baseEl = document.getElementById("debug-matricula-base");
  if (baseEl) baseEl.value = base || "";
  const dvEl = document.getElementById("debug-matricula-dv");
  if (dvEl) dvEl.value = dv || "";
  const finalEl = document.getElementById("debug-matricula-final");
  if (finalEl) finalEl.value = final || "";
  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById("debug-invalid");
  if (invalidEl) invalidEl.value = invalids.join("\n");
  const alertsEl = document.getElementById("debug-alerts");
  if (alertsEl) alertsEl.value = "";
}
function updateOutputs() {
  var _a, _b, _c, _d;
  const data = mapperHtmlToJson(document);
  const jsonEl = document.getElementById("json-output");
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  const xmlEl = document.getElementById("xml-output");
  if (xmlEl) xmlEl.value = toXml(data, "certidao_obito", 0);
  const printEl = document.getElementById("print-html");
  if (printEl) {
    const assinante = ((_a = document.querySelector('select[name="idAssinante"] option:checked')) == null ? void 0 : _a.textContent) || "";
    const tituloLivro = ((_b = document.querySelector('input[name="tituloLivro"]')) == null ? void 0 : _b.value) || "";
    const cidadeMatch = /COMARCA DE\s+(.+)$/i.exec(tituloLivro);
    const cidadeCartorio = (cidadeMatch ? cidadeMatch[1] : "") || ((_c = document.querySelector('input[name="municipioObito"]')) == null ? void 0 : _c.value) || "";
    const ufCartorio = ((_d = document.querySelector('select[name="ufMunicipioObito"]')) == null ? void 0 : _d.value) || "";
    printEl.value = buildObitoPrintHtml(data, {
      assinante: assinante.trim(),
      cidadeCartorio: cidadeCartorio.trim(),
      ufCartorio
    });
  }
  updateDebug(data);
}
function setupLiveOutputs() {
  const form = document.getElementById("form-obito");
  const handler = () => updateOutputs();
  form == null ? void 0 : form.addEventListener("input", handler);
  form == null ? void 0 : form.addEventListener("change", handler);
  updateOutputs();
}
function setupTogglePanels() {
  document.querySelectorAll("[data-toggle]").forEach((toggle) => {
    const key = toggle.getAttribute("data-toggle");
    const panel = document.querySelector(`[data-toggle-panel="${key}"]`);
    if (!panel) return;
    toggle.addEventListener("click", () => {
      const isHidden = panel.style.display === "none" || !panel.style.display;
      panel.style.display = isHidden ? "block" : "none";
    });
  });
}
function resolveField(input) {
  return input.closest("td") || input.closest(".campo") || input.closest(".field") || input.parentElement;
}
function setFieldHint(field, message) {
  if (!field) return;
  let hint = field.querySelector(".hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "hint";
    field.appendChild(hint);
  }
  if (message) {
    hint.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = "\u26A0";
    icon.setAttribute("aria-hidden", "true");
    hint.appendChild(icon);
    const txt = document.createElement("span");
    txt.className = "hint-text";
    txt.textContent = message;
    hint.appendChild(txt);
    hint.classList.add("visible");
    let aria = document.getElementById("aria-live-errors");
    if (!aria) {
      aria = document.createElement("div");
      aria.id = "aria-live-errors";
      aria.className = "sr-only";
      aria.setAttribute("aria-live", "assertive");
      aria.setAttribute("role", "status");
      document.body.appendChild(aria);
    }
    aria.textContent = message;
  } else {
    hint.innerHTML = "";
    hint.classList.remove("visible");
  }
}
function clearFieldHint(field) {
  setFieldHint(field, "");
}
function setupFocusEmphasis() {
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
      }
      el.classList.add("focus-emphasis");
    }
  });
  document.addEventListener("focusout", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) el.classList.remove("focus-emphasis");
  });
}
function applyState(input, field, state) {
  applyFieldState(field, state);
  if (input) input.classList.toggle("invalid", state === "empty" || state === "invalid");
}
function setupValidation() {
  document.querySelectorAll("input[data-date]").forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute("data-required");
    const onInput = () => {
      applyDateMask(input);
      clearFieldHint(field);
      const normalized = normalizeDate(input.value);
      const isValid2 = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid: isValid2 });
      applyState(input, field, state);
    };
    const onBlur = () => {
      applyDateMask(input);
      const raw = input.value || "";
      const res = validateDateDetailed(raw);
      const isValid2 = res.ok;
      const state = getFieldState({ required, value: raw, isValid: isValid2 });
      applyState(input, field, state);
      if (!isValid2 && raw) {
        setFieldHint(field, res.message || "Data inv\xE1lida");
      } else {
        clearFieldHint(field);
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    applyDateMask(input);
  });
  document.querySelectorAll("input[data-time]").forEach((input) => {
    const field = resolveField(input);
    const required = input.hasAttribute("data-required");
    const handler = () => {
      applyTimeMask(input);
      const normalized = normalizeTime(input.value);
      const isValid2 = !input.value || !!normalized;
      const state = getFieldState({ required, value: input.value, isValid: isValid2 });
      applyState(input, field, state);
    };
    input.addEventListener("input", handler);
    input.addEventListener("blur", handler);
    applyTimeMask(input);
  });
  const enableNameValidation = localStorage.getItem(ENABLE_NAME_KEY) !== "false";
  if (enableNameValidation) {
    document.querySelectorAll("[data-name-validate]").forEach((input) => {
      const field = resolveField(input);
      const required = input.hasAttribute("data-required");
      const handler = () => {
        const res = validateName(input.value, { minWords: 2 });
        const state = getFieldState({
          required,
          value: input.value,
          isValid: !res.invalid,
          warn: res.warn
        });
        applyState(input, field, state);
      };
      input.addEventListener("input", handler);
      input.addEventListener("blur", handler);
      input.value = formatCpfInput(input.value);
    });
  }
  const enableCpfValidation = localStorage.getItem(ENABLE_CPF_KEY) !== "false";
  if (enableCpfValidation) {
    document.querySelectorAll("input[data-cpf]").forEach((input) => {
      const field = resolveField(input);
      const required = input.hasAttribute("data-required");
      const handler = () => {
        input.value = formatCpfInput(input.value);
        const digits = normalizeCpf(input.value);
        const isValid2 = !digits || isValidCpf(digits);
        const state = getFieldState({ required, value: digits ? input.value : "", isValid: isValid2 });
        applyState(input, field, state);
      };
      input.addEventListener("input", handler);
      input.addEventListener("blur", () => {
        handler();
        const digits = normalizeCpf(input.value);
        if (input.value && (!digits || !isValidCpf(digits))) setFieldHint(field, "CPF inv\xE1lido");
        else clearFieldHint(field);
      });
      handler();
    });
  }
  function canProceed2() {
    const invalids = collectInvalidFields(document);
    if (!invalids || invalids.length === 0) return true;
    setStatus(`${invalids.length} campo(s) inv\xE1lido(s). Corrija antes de prosseguir.`, true);
    showToast("Existem campos inv\xE1lidos \u2014 corrija antes de prosseguir");
    const invalidEl = document.getElementById("debug-invalid");
    if (invalidEl) invalidEl.value = invalids.join("\n");
    return false;
  }
  function updateActionButtons2() {
    const invalids = collectInvalidFields(document);
    const disabled = !!(invalids && invalids.length > 0);
    const btnJson = document.getElementById("btn-json");
    if (btnJson) btnJson.disabled = disabled;
    const btnXml = document.getElementById("btn-xml");
    if (btnXml) btnXml.disabled = disabled;
    const btnPrint = document.getElementById("btn-print");
    if (btnPrint) btnPrint.disabled = disabled;
    const statusEl = document.getElementById("statusText");
    if (statusEl && !disabled) statusEl.textContent = "Pronto";
    let summary = document.getElementById("form-error-summary");
    if (!summary) {
      summary = document.createElement("div");
      summary.id = "form-error-summary";
      summary.style.margin = "6px 0 0 0";
      summary.style.padding = "6px 8px";
      summary.style.borderRadius = "6px";
      summary.style.background = "transparent";
      summary.style.border = "none";
      summary.style.color = "#6b7280";
      summary.style.fontSize = "12px";
      summary.style.opacity = "0.85";
      const container = document.querySelector(".container");
      if (container) container.appendChild(summary);
    }
    if (disabled) {
      summary.textContent = `Campos inv\xE1lidos: ${invalids.join(", ")}`;
      summary.style.display = "block";
    } else if (summary) {
      summary.style.display = "none";
    }
    let aria = document.getElementById("aria-live-errors");
    if (!aria) {
      aria = document.createElement("div");
      aria.id = "aria-live-errors";
      aria.className = "sr-only";
      aria.setAttribute("aria-live", "assertive");
      aria.setAttribute("role", "status");
      document.body.appendChild(aria);
    }
    aria.textContent = disabled ? `Existem ${invalids.length} campos inv\xE1lidos: ${invalids.join(", ")}` : "";
  }
  document.querySelectorAll("select[data-required], textarea[data-required], input[data-required]").forEach((input) => {
    if (input.hasAttribute("data-date") || input.hasAttribute("data-time") || input.hasAttribute("data-cpf") || input.hasAttribute("data-name-validate")) return;
    const field = resolveField(input);
    const required = input.hasAttribute("data-required");
    const handler = () => {
      const state = getFieldState({ required, value: input.value, isValid: true });
      applyState(input, field, state);
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
}
function setupNameValidation() {
  const validator = createNameValidator();
  const fields = document.querySelectorAll("[data-name-validate]");
  const timers = /* @__PURE__ */ new Map();
  fields.forEach((input) => {
    const field = resolveField(input);
    if (field) field.classList.add("name-field");
    let hint = field ? field.querySelector(".name-suggest") : null;
    if (field && !hint) {
      hint = document.createElement("button");
      hint.type = "button";
      hint.className = "name-suggest";
      hint.textContent = "Parece incorreto - adicionar ao dicionario?";
      field.appendChild(hint);
    }
    if (hint) {
      hint.addEventListener("click", (e) => {
        e.preventDefault();
        const value = input.value;
        if (!value) return;
        validator.repo.addException(value);
        input.classList.remove("invalid");
        if (field) field.classList.remove("name-suspect");
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      });
    }
    const runCheck = () => {
      const value = input.value || "";
      const result = validator.check(value);
      const suspect = !!result.suspicious;
      input.classList.toggle("invalid", suspect);
      if (field) field.classList.toggle("name-suspect", suspect);
      if (suspect) {
        showToast("Nome possivelmente incorreto");
        if (!timers.has(input)) {
          const id = setInterval(() => {
            if (input.classList.contains("invalid")) showToast("Nome possivelmente incorreto");
          }, 18e4);
          timers.set(input, id);
        }
      } else {
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      }
    };
    input.addEventListener("input", () => {
      if (nameValidationMode === "input") runCheck();
    });
    input.addEventListener("blur", () => {
      if (nameValidationMode === "blur" || nameValidationMode === "input") runCheck();
    });
  });
  validator.ready.then(() => {
    fields.forEach((input) => {
      const field = resolveField(input);
      if (field) field.classList.remove("name-suspect");
      const value = input.value || "";
      if (value) {
        const result = validator.check(value);
        const suspect = !!result.suspicious;
        input.classList.toggle("invalid", suspect);
        if (field) field.classList.toggle("name-suspect", suspect);
      }
    });
  });
}
function setup() {
  var _a, _b, _c, _d, _e;
  (_a = document.getElementById("btn-json")) == null ? void 0 : _a.addEventListener("click", (e) => {
    e.preventDefault();
    generateJson();
  });
  (_b = document.getElementById("btn-xml")) == null ? void 0 : _b.addEventListener("click", (e) => {
    e.preventDefault();
    generateXml();
  });
  (_c = document.getElementById("btn-print")) == null ? void 0 : _c.addEventListener("click", (e) => {
    e.preventDefault();
    openPrintPreview();
  });
  setupValidation();
  populateOrgaoAndUf();
  setupNameValidation();
  setupConfigPanel();
  setupAdminPanel();
  applyDrawerPosition(localStorage.getItem(DRAWER_POS_KEY) || "bottom-right");
  setupSettingsPanel();
  arrangePanel();
  setupDrawerToggle();
  setupActSelect();
  setupPrimaryShortcut(() => document.getElementById("btn-json") || document.getElementById("btn-xml"));
  setupTogglePanels();
  setupLiveOutputs();
  setupFocusEmphasis();
  updateActionButtons();
  (_d = document.getElementById("form-obito")) == null ? void 0 : _d.addEventListener("input", updateActionButtons);
  (_e = document.getElementById("form-obito")) == null ? void 0 : _e.addEventListener("change", updateActionButtons);
}
setup();
/*! Bundled license information:

papaparse/papaparse.min.js:
  (* @license
  Papa Parse
  v5.5.3
  https://github.com/mholt/PapaParse
  License: MIT
  *)

cpf-cnpj-validator/dist/cpf-cnpj-validator.es.js:
  (*!
   * cpf-cnpj-validator v1.0.3
   * (c) 2020-present Carvalho, Vinicius Luiz <carvalho.viniciusluiz@gmail.com>
   * Released under the MIT License.
   *)
*/
