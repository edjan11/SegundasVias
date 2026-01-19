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
        // Legacy bundle stub: original monolithic bundle removed
        // This lightweight shim loads the new refactored bundle (dist/app.bundle.js).
        (function loadRefactorBundleShim(){
          try{
            if(typeof document === 'undefined') return;
            const scriptPath = '../../dist/app.bundle.js';
            const existing = document.querySelector(`script[data-refactor-bundle][src="${scriptPath}"]`);
            if(existing) return;
            const s = document.createElement('script');
            s.setAttribute('data-refactor-bundle','1');
            s.src = scriptPath;
            s.defer = false;
            s.async = false;
            document.head.appendChild(s);
          }catch(e){
            console.warn('Failed to load refactor bundle shim', e);
          }
        })();
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

// ui/ts/acts/casamento/mapperHtmlToJson.ts
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
function mapRegimeBens(value) {
  const map = {
    L: "Separacao legal de bens",
    C: "Separacao convencional de bens",
    B: "Comunhao de bens",
    P: "Comunhao parcial de bens",
    U: "Comunhao universal de bens",
    A: "Participacao final de bens nos aquestos",
    I: "Ignorado"
  };
  return map[value] || "";
}
function mapEstadoCivil(value) {
  const map = {
    SJ: "Separado(a) judicialmente",
    DE: "Desquitado(a)",
    DI: "Divorciado(a)",
    SO: "Solteiro(a)",
    VI: "Viuvo(a)",
    IG: "Ignorado"
  };
  return map[value] || "";
}
function buildGenitores(pai, mae) {
  const p = normalizeText(pai);
  const m = normalizeText(mae);
  if (!p && !m) return "";
  return `${p};${m}`;
}
function normalizeCpfFields(raw) {
  const digits = normalizeCpf(raw);
  if (!digits) return { cpf: "", cpf_sem_inscricao: true };
  if (!isValidCpf(digits)) return { cpf: "", cpf_sem_inscricao: true };
  return { cpf: formatCpf(digits), cpf_sem_inscricao: false };
}
function extractSelo(text) {
  const obs = String(text || "");
  const seloMatch = /SELO[^0-9]*([0-9]+)/i.exec(obs);
  const codMatch = /(COD|CODIGO|C[OÓ]DIGO)[^0-9]*([0-9]+)/i.exec(obs);
  return {
    selo: seloMatch ? seloMatch[1] : "",
    cod_selo: codMatch ? codMatch[2] : ""
  };
}
function buildRgItem(numero, data, orgao) {
  const doc = normalizeText(numero);
  if (!doc) return null;
  return {
    tipo: "RG",
    documento: doc,
    orgao_emissor: normalizeText(orgao),
    uf_emissao: "IG",
    data_emissao: normalizeDate(data)
  };
}
function mapperHtmlToJson(root = document) {
  const cnsInput = root.querySelector('input[data-bind="certidao.cartorio_cns"]');
  if (cnsInput) {
    cnsInput.value = "163659";
    cnsInput.readOnly = true;
  }
  const observacao = getInputValue("observacao", root);
  const seloInfo = extractSelo(observacao);
  const seloInput = normalizeText(getInputValue("certidao.selo", root));
  const codInput = normalizeText(getInputValue("certidao.cod_selo", root));
  const plataformaId = normalizeText(getInputValue("certidao.plataformaId", root));
  const tipoCertidao = normalizeText(getSelectValue("certidao.tipo_certidao", root));
  const modalidade = normalizeText(getSelectValue("certidao.modalidade", root));
  const cartorioCns = "163659";
  const cotaEmolumentos = normalizeText(getInputValue("certidao.cota_emolumentos", root));
  const transcricao = getCheckboxValue("certidao.transcricao", root);
  const noivoCpf = normalizeCpfFields(getInputValue("CPFNoivo", root));
  const noivaCpf = normalizeCpfFields(getInputValue("CPFNoiva", root));
  const noivoRg = buildRgItem(
    getInputValue("numeroRGNoivo", root),
    getInputValue("dataExpedicaoRGNoivo", root),
    getSelectText("idOrgaoExpedidorRGNoivo", root)
  );
  const noivaRg = buildRgItem(
    getInputValue("numeroRGNoiva", root),
    getInputValue("dataExpedicaoRGNoiva", root),
    getSelectText("idOrgaoExpedidorRGNoiva", root)
  );
  const conjuges = [
    {
      nome_atual_habilitacao: normalizeText(getInputValue("nomeSolteiro", root)),
      cpf_sem_inscricao: noivoCpf.cpf_sem_inscricao,
      cpf: noivoCpf.cpf,
      novo_nome: normalizeText(getInputValue("nomeSolteiro", root)),
      nome_apos_casamento: normalizeText(getInputValue("nomeCasado", root)),
      data_nascimento: normalizeDate(getInputValue("dataNascimentoNoivo", root)),
      nacionalidade: normalizeText(getInputValue("nacionalidadeNoivo", root)),
      estado_civil: mapEstadoCivil(getSelectValue("estadoCivilNoivo", root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue("cidadeNascimentoNoivo", root)),
      uf_naturalidade: normalizeUf(getInputValue("ufNascimentoNoivo", root), { forceIg: true }),
      genitores: buildGenitores(
        getInputValue("nomePaiNoivo", root),
        getInputValue("nomeMaeNoivo", root)
      )
    },
    {
      nome_atual_habilitacao: normalizeText(getInputValue("nomeSolteira", root)),
      cpf_sem_inscricao: noivaCpf.cpf_sem_inscricao,
      cpf: noivaCpf.cpf,
      novo_nome: normalizeText(getInputValue("nomeSolteira", root)),
      nome_apos_casamento: normalizeText(getInputValue("nomeCasada", root)),
      data_nascimento: normalizeDate(getInputValue("dataNascimentoNoiva", root)),
      nacionalidade: normalizeText(getInputValue("nacionalidadeNoiva", root)),
      estado_civil: mapEstadoCivil(getSelectValue("estadoCivilNoiva", root)),
      municipio_naturalidade: normalizeMunicipio(getInputValue("cidadeNascimentoNoiva", root)),
      uf_naturalidade: normalizeUf(getInputValue("ufNascimentoNoiva", root), { forceIg: true }),
      genitores: buildGenitores(
        getInputValue("nomePaiNoiva", root),
        getInputValue("nomeMaeNoiva", root)
      )
    }
  ];
  const anotacoes = {
    primeiro_conjuge: [],
    segundo_conjuge: []
  };
  if (noivoRg) anotacoes.primeiro_conjuge.push(noivoRg);
  if (noivaRg) anotacoes.segundo_conjuge.push(noivaRg);
  return {
    certidao: {
      plataformaId,
      tipo_registro: "casamento",
      tipo_certidao: tipoCertidao,
      transcricao,
      cartorio_cns: cartorioCns,
      // Sempre fixo
      selo: seloInput || seloInfo.selo,
      cod_selo: codInput || seloInfo.cod_selo,
      modalidade,
      cota_emolumentos: cotaEmolumentos,
      cota_emolumentos_isento: false
    },
    registro: {
      conjuges,
      matricula: "",
      data_celebracao: normalizeDate(getInputValue("dataCasamento", root)),
      regime_bens: mapRegimeBens(getSelectValue("regimeBens", root)),
      data_registro: normalizeDate(getInputValue("dataTermo", root)),
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
function applyFieldState(el, state2) {
  if (!el) return;
  el.classList.toggle("field--error", state2 === "empty" || state2 === "invalid");
  el.classList.toggle("field--empty", state2 === "empty");
  el.classList.toggle("field--invalid", state2 === "invalid");
  el.classList.toggle("field--warn", state2 === "warn");
}

// ui/ts/shared/ui/mask.ts
function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}
function applyDateMask(input) {
  if (!input) return;
  const digits = digitsOnly(input.value).slice(0, 8);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += "/" + digits.slice(2, 4);
  else if (digits.length > 2) out += "/" + digits.slice(2);
  if (digits.length >= 5) out += "/" + digits.slice(4, 8);
  input.value = out;
}

// ui/ts/shared/ui/drawer.ts
function setupDrawer(opts = {}) {
  const drawer = document.getElementById("drawer");
  const toggle = document.getElementById("drawer-toggle");
  const close = document.getElementById("drawer-close");
  if (!drawer) return { open: () => {
  }, close: () => {
  }, setTab: () => {
  } };
  const tabs = Array.from(drawer.querySelectorAll(".tab-btn"));
  const panes = Array.from(drawer.querySelectorAll(".tab-pane"));
  let activeTab = opts.defaultTab || tabs[0] && tabs[0].dataset.tab || "";
  const setTab = (id) => {
    if (!id) return;
    activeTab = id;
    tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === id));
    panes.forEach((pane) => pane.classList.toggle("active", pane.id === id));
  };
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab || "";
      setTab(id);
      drawer.classList.add("open");
    });
  });
  const open = (id) => {
    if (id) setTab(id);
    drawer.classList.add("open");
  };
  const hide = () => drawer.classList.remove("open");
  toggle == null ? void 0 : toggle.addEventListener("click", () => open(activeTab));
  close == null ? void 0 : close.addEventListener("click", hide);
  if (activeTab) setTab(activeTab);
  return { open, close: hide, setTab };
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

// ui/ts/shared/matricula/cnj.ts
function digitsOnly2(value) {
  return String(value || "").replace(/\D/g, "");
}
function padLeft(value, size) {
  const digits = digitsOnly2(value);
  if (!digits) return "";
  return digits.padStart(size, "0").slice(-size);
}
function buildMatriculaBase30(args) {
  const cns = digitsOnly2(args.cns6 || "");
  const ano = digitsOnly2(args.ano || "");
  const tipoAto = digitsOnly2(args.tipoAto || "");
  const acervo = digitsOnly2(args.acervo || "01").padStart(2, "0");
  const servico = digitsOnly2(args.servico || "55").padStart(2, "0");
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

// ui/ts/shared/productivity/index.ts
function lockInput(input) {
  if (!input) return;
  input.readOnly = true;
  input.tabIndex = -1;
  input.classList.add("input-locked");
}
function unlockInput(input) {
  if (!input) return;
  input.readOnly = false;
  input.tabIndex = 0;
  input.classList.remove("input-locked");
}
function setupPrimaryShortcut(getPrimary) {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      const target = typeof getPrimary === "function" ? getPrimary() : null;
      target == null ? void 0 : target.click();
    }
  });
}
function setupNameCopy(sourceSelector, targetSelector) {
  const source = document.querySelector(sourceSelector);
  const target = document.querySelector(targetSelector);
  if (!source || !target) return;
  let lastAuto = "";
  const applyCopy = () => {
    const value = String(source.value || "").trim();
    if (!value) return;
    if (!target.value || target.value === lastAuto) {
      target.value = value;
      lastAuto = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  source.addEventListener("blur", applyCopy);
  source.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      applyCopy();
    }
  });
}
function setupAutoNationality(selector, value) {
  const input = document.querySelector(selector);
  if (!input) return;
  if (String(input.value || "").trim()) return;
  input.value = value;
  lockInput(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function setupCasamentoDates(opts = {}) {
  const dataTermo = document.querySelector(opts.dataTermoSelector || 'input[name="dataTermo"]');
  const tipo = document.querySelector(opts.tipoSelector || 'select[name="tipoCasamento"]');
  const dataCasamento = document.querySelector(opts.dataCasamentoSelector || 'input[name="dataCasamento"]');
  const regime = document.querySelector(opts.regimeSelector || 'select[name="regimeBens"]');
  if (!dataTermo || !tipo || !dataCasamento || !regime) return;
  const lock = () => {
    dataCasamento.value = dataTermo.value;
    lockInput(dataCasamento);
    dataCasamento.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const unlock = () => {
    unlockInput(dataCasamento);
    if (!dataCasamento.value) dataCasamento.focus();
  };
  const apply = () => {
    if (tipo.value === "R") {
      unlock();
    } else {
      lock();
      tipo.focus();
    }
  };
  dataTermo.addEventListener("input", () => {
    if (dataTermo.value) lock();
  });
  tipo.addEventListener("change", apply);
  dataTermo.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      tipo.focus();
    }
  });
  dataCasamento.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      regime.focus();
    }
  });
  apply();
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
function normalizeText2(value) {
  return stripAccents(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
var STOPWORDS = /* @__PURE__ */ new Set([
  "hospital",
  "maternidade",
  "clinica",
  "cl\xEDnica",
  "unidade",
  "posto",
  "upa",
  "ubs",
  "santa",
  "santo",
  "sao",
  "s\xE3o",
  "san",
  "dr",
  "dra"
]);
function tokenize(normalizedText) {
  return (normalizedText || "").split(" ").map((t) => t.trim()).filter((t) => t && !STOPWORDS.has(t));
}
function stripCityUfSuffix(value) {
  const raw = (value || "").trim();
  if (!raw) return "";
  return raw.replace(/\s*[,;]\s*[\p{L}][\p{L}\s.'-]{1,}\s*(?:\/|-|\s)\s*[A-Za-z]{2}\s*$/u, "").trim();
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

// ui/ts/dom.ts
function byId(id) {
  return document.getElementById(id);
}
function qs(selector, root = document) {
  return root.querySelector(selector);
}
function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

// ui/ts/state.ts
var state = {
  certidao: {
    plataformaId: "certidao-eletronica",
    tipo_registro: "nascimento",
    tipo_certidao: "Breve relato",
    transcricao: false,
    cartorio_cns: "163659",
    selo: "",
    cod_selo: "",
    modalidade: "eletronica",
    cota_emolumentos: "",
    cota_emolumentos_isento: false
  },
  registro: {
    nome_completo: "",
    cpf_sem_inscricao: false,
    cpf: "",
    matricula: "",
    data_registro: "",
    data_nascimento_ignorada: false,
    data_nascimento: "",
    hora_nascimento_ignorada: false,
    hora_nascimento: "",
    municipio_naturalidade: "",
    uf_naturalidade: "",
    local_nascimento: "",
    municipio_nascimento: "",
    uf_nascimento: "",
    sexo: "",
    sexo_outros: "",
    gemeos: { quantidade: "" },
    numero_dnv: "",
    averbacao_anotacao: ""
  },
  ui: {
    gemeos_irmao_raw: "",
    anotacoes_raw: "",
    cartorio_oficio: "",
    casamento_tipo: "",
    matricula_livro: "",
    matricula_folha: "",
    matricula_termo: "",
    naturalidade_diferente: false,
    mae_nome: "",
    mae_uf: "",
    mae_cidade: "",
    mae_avo_materna: "",
    mae_avo_materno: "",
    pai_nome: "",
    pai_uf: "",
    pai_cidade: "",
    pai_avo_paterna: "",
    pai_avo_paterno: ""
  }
};
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === void 0) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}
function getByPath(obj, path) {
  return path.split(".").reduce((acc, p) => acc ? acc[p] : void 0, obj);
}
function setBoundValue(path, value) {
  setByPath(state, path, value);
  const el = qs(`[data-bind="${path}"]`);
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value !== void 0 && value !== null ? String(value) : "";
}
function syncInputsFromState() {
  qsa("[data-bind]").forEach((el) => {
    const path = el.getAttribute("data-bind") || "";
    const val = getByPath(state, path);
    if (el.type === "checkbox") {
      el.checked = !!val;
      return;
    }
    if (path === "registro.cpf") {
      el.value = formatCpf2(val);
      return;
    }
    if (path === "registro.data_registro" || path === "registro.data_nascimento") {
      el.value = normalizeDateValue(val);
      return;
    }
    if (path === "registro.hora_nascimento") {
      el.value = normalizeTimeValue(val);
      return;
    }
    el.value = val !== void 0 && val !== null ? String(val) : "";
  });
}
function bindDataBindInputs(onPathChange2) {
  qsa("[data-bind]").forEach((el) => {
    const path = el.getAttribute("data-bind") || "";
    const handler = () => {
      if (el.type === "checkbox") {
        setByPath(state, path, el.checked);
        if (onPathChange2) onPathChange2(path);
        return;
      }
      if (path === "registro.data_registro" || path === "registro.data_nascimento") {
        const formatted = formatDateInput(el.value);
        setByPath(state, path, formatted);
        el.value = formatted;
        if (onPathChange2) onPathChange2(path);
        return;
      }
      if (path === "registro.hora_nascimento") {
        const formatted = formatTimeInput(el.value);
        setByPath(state, path, formatted);
        el.value = formatted;
        if (onPathChange2) onPathChange2(path);
        return;
      }
      if (path === "registro.cpf") {
        const digits = normalizeCpfValue(el.value);
        setByPath(state, path, digits);
        el.value = formatCpf2(digits);
        if (onPathChange2) onPathChange2(path);
        return;
      }
      setByPath(state, path, el.value);
      if (onPathChange2) onPathChange2(path);
    };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });
}
function trimValue(value) {
  return String(value || "").trim();
}
function digitsOnly3(value) {
  return String(value || "").replace(/\D/g, "");
}
function formatDateInput(value) {
  const digits = digitsOnly3(value).slice(0, 8);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += "/" + digits.slice(2, 4);
  else if (digits.length > 2) out += "/" + digits.slice(2);
  if (digits.length >= 5) out += "/" + digits.slice(4, 8);
  return out;
}
function formatTimeInput(value) {
  const digits = digitsOnly3(value).slice(0, 4);
  let out = "";
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length > 2) out += ":" + digits.slice(2, 4);
  return out;
}
function normalizeDateValue(value) {
  const raw = trimValue(value);
  if (!raw) return "";
  const digits = digitsOnly3(raw);
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  return raw;
}
function normalizeTimeValue(value) {
  const raw = trimValue(value);
  if (!raw) return "";
  const digits = digitsOnly3(raw);
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  return raw;
}
function normalizeCpfValue(value) {
  return digitsOnly3(value).slice(0, 11);
}
function formatCpf2(value) {
  const digits = normalizeCpfValue(value);
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
function parseLines(raw, mapper) {
  if (!raw) return [];
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(mapper);
}
function parseIrmaos(raw) {
  return parseLines(raw, (line) => {
    const parts = line.split("|");
    return { nome: trimValue(parts[0]), matricula: trimValue(parts[1]) };
  });
}
function parseAnotacoes(raw) {
  return parseLines(raw, (line) => {
    const parts = line.split("|");
    return {
      tipo: trimValue(parts[0]),
      documento: trimValue(parts[1]),
      orgao_emissor: trimValue(parts[2]),
      uf_emissao: trimValue(parts[3]),
      data_emissao: trimValue(parts[4])
    };
  });
}
function buildFiliacaoItem(nome, cidade, uf, avo1, avo2) {
  const n = trimValue(nome);
  const c = trimValue(cidade);
  const u = trimValue(uf);
  const a1 = trimValue(avo1);
  const a2 = trimValue(avo2);
  if (!n && !c && !u && !a1 && !a2) return null;
  const avos = [a1, a2].filter(Boolean).join("; ");
  return { nome: n, municipio_nascimento: c, uf_nascimento: u, avos };
}
function normalizeData() {
  const cert = state.certidao;
  const reg = state.registro;
  const cpfDigits = normalizeCpfValue(reg.cpf);
  const cpfExists = cpfDigits.length > 0;
  const cpfSem = !!reg.cpf_sem_inscricao;
  const dataIgn = !!reg.data_nascimento_ignorada;
  const horaIgn = !!reg.hora_nascimento_ignorada;
  const natDifferent = !!state.ui.naturalidade_diferente;
  const municipioNascimento = trimValue(reg.municipio_nascimento);
  const ufNascimento = trimValue(reg.uf_nascimento);
  let municipioNaturalidade = trimValue(reg.municipio_naturalidade);
  let ufNaturalidade = trimValue(reg.uf_naturalidade);
  if (!natDifferent) {
    municipioNaturalidade = municipioNascimento;
    ufNaturalidade = ufNascimento;
  }
  const certidao = {
    plataformaId: trimValue(cert.plataformaId),
    tipo_registro: trimValue(cert.tipo_registro),
    tipo_certidao: trimValue(cert.tipo_certidao),
    transcricao: !!cert.transcricao,
    cartorio_cns: trimValue(cert.cartorio_cns),
    selo: trimValue(cert.selo),
    cod_selo: trimValue(cert.cod_selo),
    modalidade: trimValue(cert.modalidade),
    cota_emolumentos: trimValue(cert.cota_emolumentos),
    cota_emolumentos_isento: !!cert.cota_emolumentos_isento
  };
  const filiacao = [];
  const mae = buildFiliacaoItem(state.ui.mae_nome, state.ui.mae_cidade, state.ui.mae_uf, state.ui.mae_avo_materna, state.ui.mae_avo_materno);
  if (mae) filiacao.push(mae);
  const pai = buildFiliacaoItem(state.ui.pai_nome, state.ui.pai_cidade, state.ui.pai_uf, state.ui.pai_avo_paterna, state.ui.pai_avo_paterno);
  if (pai) filiacao.push(pai);
  const matriculaFull = trimValue(reg.matricula);
  const matriculaDv = matriculaFull.length >= 2 ? matriculaFull.slice(-2) : "";
  const matriculaBase = matriculaFull.length > 2 ? matriculaFull.slice(0, -2) : "";
  const registro = {
    nome_completo: trimValue(reg.nome_completo),
    cpf_sem_inscricao: cpfSem,
    cpf: cpfExists ? cpfDigits : "",
    matricula: matriculaFull,
    matricula_base: matriculaBase,
    matricula_dv: matriculaDv,
    cartorio_oficio: trimValue(state.ui.cartorio_oficio),
    cartorio_cns: trimValue(cert.cartorio_cns),
    matricula_livro: trimValue(state.ui.matricula_livro),
    matricula_folha: trimValue(state.ui.matricula_folha),
    matricula_termo: trimValue(state.ui.matricula_termo),
    casamento_tipo: trimValue(state.ui.casamento_tipo),
    data_registro: normalizeDateValue(reg.data_registro),
    data_nascimento_ignorada: dataIgn,
    data_nascimento: dataIgn ? "" : normalizeDateValue(reg.data_nascimento),
    hora_nascimento_ignorada: horaIgn,
    hora_nascimento: horaIgn ? "" : normalizeTimeValue(reg.hora_nascimento),
    municipio_naturalidade: municipioNaturalidade,
    uf_naturalidade: ufNaturalidade,
    local_nascimento: trimValue(reg.local_nascimento),
    municipio_nascimento: municipioNascimento,
    uf_nascimento: ufNascimento,
    sexo: trimValue(reg.sexo),
    gemeos: { quantidade: trimValue(reg.gemeos.quantidade), irmao: parseIrmaos(state.ui.gemeos_irmao_raw) },
    filiacao,
    numero_dnv: trimValue(reg.numero_dnv),
    averbacao_anotacao: trimValue(reg.averbacao_anotacao),
    anotacoes_cadastro: parseAnotacoes(state.ui.anotacoes_raw)
  };
  if (registro.sexo === "outros") registro.sexo_outros = trimValue(reg.sexo_outros);
  return { certidao, registro };
}
function computeSnapshot() {
  return JSON.stringify(normalizeData());
}
function stripAccentsForFilename(value) {
  return stripAccents(value || "");
}
function normalizeFilePart(value, fallback) {
  const clean = stripAccentsForFilename(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return clean || fallback;
}
function makeTimestamp() {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function buildFileName(data, ext) {
  const tipo = normalizeFilePart(data.certidao.tipo_registro || "nascimento", "NASCIMENTO");
  const nome = normalizeFilePart(data.registro.nome_completo, "SEM_NOME");
  const cpfDigits = (data.registro.cpf || "").replace(/\D/g, "");
  const cpfPart = cpfDigits ? cpfDigits : "SEM_CPF";
  const stamp = makeTimestamp();
  return `${tipo}_${nome}_${cpfPart}_${stamp}.${ext}`;
}

// ui/ts/validators.ts
function clearInvalid() {
  qsa(".invalid").forEach((el) => el.classList.remove("invalid"));
}
function markInvalid(path) {
  const el = qs(`[data-bind="${path}"]`);
  if (el) el.classList.add("invalid");
}
function isValidDate(value) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return true;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}
function isValidTime(value) {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return true;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized);
}
function validateData(data, setStatus3, context = {}) {
  var _a;
  clearInvalid();
  let ok = true;
  if (!data.registro.nome_completo) {
    markInvalid("registro.nome_completo");
    ok = false;
  }
  if (!data.registro.sexo) {
    markInvalid("registro.sexo");
    ok = false;
  }
  if (!data.registro.uf_nascimento) {
    markInvalid("registro.uf_nascimento");
    ok = false;
  }
  if (!data.registro.local_nascimento) {
    markInvalid("registro.local_nascimento");
    ok = false;
  }
  if (!data.registro.municipio_nascimento) {
    markInvalid("registro.municipio_nascimento");
    ok = false;
  }
  if (!data.certidao.modalidade) {
    markInvalid("certidao.modalidade");
    ok = false;
  }
  if (data.registro.sexo === "outros" && !data.registro.sexo_outros) {
    markInvalid("registro.sexo_outros");
    ok = false;
  }
  const tipo = (context.tipoRegistro || data.certidao.tipo_registro || "").toLowerCase();
  if ((tipo === "nascimento" || tipo === "casamento") && !normalizeDateValue(data.registro.data_registro)) {
    markInvalid("registro.data_registro");
    ok = false;
  }
  if (tipo === "casamento" && !String(context.casamentoTipo || "").trim()) {
    markInvalid("ui.casamento_tipo");
    ok = false;
  }
  if (!isValidDate(data.registro.data_registro)) {
    markInvalid("registro.data_registro");
    ok = false;
  }
  if (!isValidDate(data.registro.data_nascimento)) {
    markInvalid("registro.data_nascimento");
    ok = false;
  }
  if (!isValidTime(data.registro.hora_nascimento)) {
    markInvalid("registro.hora_nascimento");
    ok = false;
  }
  if (!data.registro.cpf_sem_inscricao && !cpf.isValid(data.registro.cpf)) {
    markInvalid("registro.cpf");
    ok = false;
  }
  if (!String(((_a = data.ui) == null ? void 0 : _a.cartorio_oficio) || "").trim()) {
    markInvalid("ui.cartorio_oficio");
    ok = false;
  }
  if (!ok && setStatus3) setStatus3("Campos obrigatorios pendentes", true);
  return ok;
}
function maskDate(el) {
  el.value = formatDateInput(el.value);
}
function maskTime(el) {
  el.value = formatTimeInput(el.value);
}
function attachMask(el, type) {
  if (!el) return;
  const handler = (e) => {
    const input = e.target;
    if (type === "date") maskDate(input);
    if (type === "time") maskTime(input);
  };
  el.addEventListener("input", handler);
  el.addEventListener("blur", handler);
}
function setupMasks() {
  attachMask(qs('[data-bind="registro.data_registro"]'), "date");
  attachMask(byId("dn"), "date");
  attachMask(byId("hn"), "time");
}

// ui/ts/placeAutofill/extractCityUf.ts
function extractCityUfFromText(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*\/\s*([A-Za-z]{2})\s*$/u,
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s*-\s*([A-Za-z]{2})\s*$/u,
    /(?:^|[,;])\s*([\p{L}][\p{L}\s.'-]{1,})\s+([A-Za-z]{2})\s*$/u
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) {
      const city = match[1].replace(/\s+/g, " ").trim();
      const uf = match[2].toUpperCase();
      return { city, uf };
    }
  }
  return null;
}

// ui/ts/placeAutofill/cache.ts
function getSafeStorage() {
  try {
    const key = "__certidao_cache_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return window.localStorage;
  } catch {
    return null;
  }
}
function createKeyValueStore(opts = {}) {
  const storageKeyPrefix = opts.storageKeyPrefix || "";
  const storage = getSafeStorage();
  const memory = /* @__PURE__ */ new Map();
  return {
    getItem(key) {
      const fullKey = storageKeyPrefix + key;
      if (storage) return storage.getItem(fullKey);
      return memory.has(fullKey) ? memory.get(fullKey) : null;
    },
    setItem(key, value) {
      const fullKey = storageKeyPrefix + key;
      if (storage) storage.setItem(fullKey, value);
      else memory.set(fullKey, value);
    },
    removeItem(key) {
      const fullKey = storageKeyPrefix + key;
      if (storage) storage.removeItem(fullKey);
      else memory.delete(fullKey);
    }
  };
}
var LocalStoragePlaceCacheRepository = class {
  constructor(opts = {}) {
    this.storageKey = opts.storageKey || "certidao.placeCache.v2";
    this.store = opts.store || createKeyValueStore();
  }
  read() {
    try {
      const raw = this.store.getItem(this.storageKey);
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
  write(data) {
    try {
      this.store.setItem(this.storageKey, JSON.stringify(data));
    } catch {
    }
  }
};
function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens || []);
  const b = new Set(bTokens || []);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
function makeKey(normalized) {
  let h = 0;
  for (let i = 0; i < normalized.length; i++) h = h * 31 + normalized.charCodeAt(i) | 0;
  return String(h);
}
var PlaceAutoFillCache = class {
  constructor(opts = {}) {
    this.maxEntries = opts.maxEntries || 200;
    this.repo = opts.repo || new LocalStoragePlaceCacheRepository();
    this.memoryData = { schemaVersion: 1, entries: [] };
  }
  normalize(text) {
    return normalizeText2(text);
  }
  tokenize(normalizedText) {
    return tokenize(normalizedText);
  }
  stripCityUfSuffix(text) {
    return stripCityUfSuffix(text);
  }
  extractCityUfFromText(text) {
    return extractCityUfFromText(text);
  }
  readData() {
    try {
      const data = this.repo.read();
      if (data && data.schemaVersion === 1) {
        this.memoryData = data;
        return data;
      }
    } catch {
    }
    return this.memoryData;
  }
  writeData(data) {
    this.memoryData = data;
    try {
      this.repo.write(data);
    } catch {
    }
  }
  prune(data) {
    const entries = data.entries || [];
    if (entries.length <= this.maxEntries) return data;
    const sorted = entries.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return { schemaVersion: 1, entries: sorted.slice(0, this.maxEntries) };
  }
  getBestMatch(input, opts = {}) {
    const threshold = opts.threshold || 0.75;
    const ambiguityGap = opts.ambiguityGap || 0.08;
    const keyText = this.normalize(this.stripCityUfSuffix(input || ""));
    if (!keyText) return null;
    const tokens = this.tokenize(keyText);
    if (!tokens.length) return null;
    const data = this.readData();
    let best = null;
    let second = null;
    for (const entry of data.entries || []) {
      const score = jaccard(tokens, entry.tokens || []);
      if (!best || score > best.score) {
        second = best;
        best = { entry, score };
      } else if (!second || score > second.score) {
        second = { entry, score };
      }
    }
    if (!best || best.score < threshold) return null;
    if (second && Math.abs(best.score - second.score) < ambiguityGap) return null;
    return best.entry;
  }
  recordMapping(args) {
    const placeText = String(args.placeText || "").trim();
    const cityBirth = String(args.cityBirth || "").trim();
    const ufBirth = String(args.ufBirth || "").trim();
    if (!placeText || !cityBirth || !ufBirth) return;
    const normalized = this.normalize(this.stripCityUfSuffix(placeText));
    if (!normalized) return;
    const data = this.readData();
    const now = Date.now();
    const key = makeKey(normalized);
    const tokens = this.tokenize(normalized);
    const existing = (data.entries || []).find((entry) => {
      const sameKey = entry.key === key;
      const sameCity = (entry.cityBirth || "").toLowerCase() === cityBirth.toLowerCase();
      const sameUf = (entry.ufBirth || "").toLowerCase() === ufBirth.toLowerCase();
      if (sameKey && sameCity && sameUf) return true;
      const similarity2 = jaccard(tokens, entry.tokens || []);
      return similarity2 >= 0.92 && sameCity && sameUf;
    });
    if (existing) {
      existing.updatedAt = now;
      existing.useCount = (existing.useCount || 0) + 1;
      existing.raw = placeText;
      const pruned2 = this.prune(data);
      this.writeData(pruned2);
      return;
    }
    const nextEntry = {
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(now),
      key,
      raw: placeText,
      normalized,
      tokens,
      cityBirth,
      ufBirth,
      cityNatural: args.cityNatural || "",
      ufNatural: args.ufNatural || "",
      createdAt: now,
      updatedAt: now,
      useCount: 1
    };
    data.entries = data.entries || [];
    data.entries.push(nextEntry);
    const pruned = this.prune(data);
    this.writeData(pruned);
  }
};

// ui/ts/placeAutofill/index.ts
function trimValue2(value) {
  return String(value || "").trim();
}
function createPlaceAutofill(opts) {
  const state2 = opts.state;
  const setBoundValue2 = opts.setBoundValue;
  const updateDirty2 = opts.updateDirty;
  const syncNaturalidadeLockedToBirth2 = opts.syncNaturalidadeLockedToBirth;
  const copyBirthToNaturalidade2 = opts.copyBirthToNaturalidade;
  const recordPlaceMappingFromState2 = opts.recordPlaceMappingFromState;
  const placeCache2 = new PlaceAutoFillCache();
  function setupLocalAutofill() {
    const localEl = byId("local-nascimento");
    const cityEl = qs('[data-bind="registro.municipio_nascimento"]');
    const ufEl = qs('[data-bind="registro.uf_nascimento"]');
    const natCityEl = qs('[data-bind="registro.municipio_naturalidade"]');
    const natUfEl = qs('[data-bind="registro.uf_naturalidade"]');
    const copyBtn = byId("copy-naturalidade");
    if (!localEl || !cityEl || !ufEl) return;
    let birthTouched = false;
    function applyPlaceEntry(entry, opts2) {
      const force = !!(opts2 && opts2.force);
      const allowNatural = !!(opts2 && opts2.allowNatural);
      const cityBirth = trimValue2(entry.cityBirth);
      const ufBirth = trimValue2(entry.ufBirth).toUpperCase();
      if (force || !trimValue2(state2.registro.municipio_nascimento)) setBoundValue2("registro.municipio_nascimento", cityBirth);
      if (force || !trimValue2(state2.registro.uf_nascimento)) setBoundValue2("registro.uf_nascimento", ufBirth);
      syncNaturalidadeLockedToBirth2();
      if (allowNatural && state2.ui.naturalidade_diferente) {
        const cityNatural = trimValue2(entry.cityNatural);
        const ufNatural = trimValue2(entry.ufNatural).toUpperCase();
        if (cityNatural) setBoundValue2("registro.municipio_naturalidade", cityNatural);
        if (ufNatural) setBoundValue2("registro.uf_naturalidade", ufNatural);
      }
    }
    const recordDebounced = debounce(() => recordPlaceMappingFromState2(), 400);
    function recordPlaceMappingFromStateWithKey(placeTextOverride) {
      const placeText = trimValue2(placeTextOverride || localEl.value);
      if (!placeText) return;
      const cityBirth = trimValue2(state2.registro.municipio_nascimento);
      const ufBirth = trimValue2(state2.registro.uf_nascimento).toUpperCase();
      const cityNatural = state2.ui.naturalidade_diferente ? trimValue2(state2.registro.municipio_naturalidade) : "";
      const ufNatural = state2.ui.naturalidade_diferente ? trimValue2(state2.registro.uf_naturalidade).toUpperCase() : "";
      if (!cityBirth || !ufBirth) return;
      placeCache2.recordMapping({ placeText, cityBirth, ufBirth, cityNatural, ufNatural });
    }
    function handleExtracted(city, uf) {
      const currentCity = trimValue2(state2.registro.municipio_nascimento);
      const currentUf = trimValue2(state2.registro.uf_nascimento);
      const cityMatches = !currentCity || currentCity.toLowerCase() === city.toLowerCase();
      const ufMatches = !currentUf || currentUf.toUpperCase() === uf.toUpperCase();
      let applied = false;
      if (!currentCity && ufMatches) {
        setBoundValue2("registro.municipio_nascimento", city);
        applied = true;
      }
      if (!currentUf && cityMatches) {
        setBoundValue2("registro.uf_nascimento", uf);
        applied = true;
      }
      if (applied) {
        syncNaturalidadeLockedToBirth2();
        updateDirty2();
        recordPlaceMappingFromState2();
        return;
      }
      recordPlaceMappingFromState2();
    }
    function runSuggest() {
      const text = localEl.value.trim();
      if (!text) return;
      const extracted = placeCache2.extractCityUfFromText(text);
      if (extracted) {
        handleExtracted(extracted.city, extracted.uf);
        return;
      }
      if (birthTouched) return;
      const match = placeCache2.getBestMatch(text, { threshold: 0.75, ambiguityGap: 0.08 });
      if (!match) return;
      applyPlaceEntry(match, { force: false, allowNatural: true });
      updateDirty2();
    }
    const suggestDebounced = debounce(() => runSuggest(), 250);
    localEl.addEventListener("input", () => {
      suggestDebounced();
    });
    localEl.addEventListener("blur", () => {
      runSuggest();
      recordPlaceMappingFromState2();
    });
    localEl.addEventListener("change", () => {
      runSuggest();
      recordPlaceMappingFromState2();
    });
    cityEl.addEventListener("input", () => {
      birthTouched = true;
      recordDebounced();
    });
    ufEl.addEventListener("change", () => {
      birthTouched = true;
      recordDebounced();
    });
    natCityEl == null ? void 0 : natCityEl.addEventListener("input", recordDebounced);
    natUfEl == null ? void 0 : natUfEl.addEventListener("change", recordDebounced);
    copyBtn == null ? void 0 : copyBtn.addEventListener("click", () => {
      copyBirthToNaturalidade2();
      updateDirty2();
      recordPlaceMappingFromState2();
    });
  }
  return { placeCache: placeCache2, setupLocalAutofill };
}

// ui/ts/events.ts
var lastSavedSnapshot = "";
var lastSavedId = "";
var isDirty = true;
var currentDirs = { jsonDir: "", xmlDir: "" };
var NAME_MODE_KEY = "ui.nameValidationMode";
var nameValidationMode = localStorage.getItem(NAME_MODE_KEY) || "input";
function setStatus(text, isError) {
  const el = byId("statusText");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#dc2626" : "#64748b";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = "Pronto";
    el.style.color = "#64748b";
  }, 2e3);
}
function setDirty(flag) {
  isDirty = !!flag;
  const btn = byId("btn-save");
  if (!btn) return;
  btn.classList.toggle("dirty", isDirty);
}
function updateDirty() {
  const snap = computeSnapshot();
  setDirty(snap !== lastSavedSnapshot);
}
function updateTipoButtons() {
  const tipo = state.certidao.tipo_registro || "nascimento";
  const input = qs('[data-bind="certidao.tipo_registro"]');
  if (input) input.value = tipo;
  const casamentoWrap = byId("casamento-tipo-wrap");
  if (casamentoWrap) casamentoWrap.style.display = tipo === "casamento" ? "flex" : "none";
}
function updateSexoOutros() {
  const sexo = state.registro.sexo;
  const wrap = byId("sexo-outros-wrap");
  const input = byId("sexo-outros");
  if (!wrap || !input) return;
  const enabled = sexo === "outros";
  wrap.style.display = enabled ? "flex" : "none";
  if (!enabled) {
    input.value = "";
    state.registro.sexo_outros = "";
  }
}
function updateIgnoreFields() {
  const dnIgn = !!state.registro.data_nascimento_ignorada;
  const hnIgn = !!state.registro.hora_nascimento_ignorada;
  const dn = byId("dn");
  const hn = byId("hn");
  if (dn) {
    dn.disabled = dnIgn;
    if (dnIgn) {
      dn.value = "";
      state.registro.data_nascimento = "";
    }
  }
  if (hn) {
    hn.disabled = hnIgn;
    if (hnIgn) {
      hn.value = "";
      state.registro.hora_nascimento = "";
    }
  }
}
var naturalidadeMemo = { city: "", uf: "" };
var naturalidadeEdited = false;
function rememberNaturalidadeEdit() {
  if (!state.ui.naturalidade_diferente) return;
  naturalidadeEdited = true;
  naturalidadeMemo = {
    city: trimValue(state.registro.municipio_naturalidade),
    uf: trimValue(state.registro.uf_naturalidade)
  };
}
function copyBirthToNaturalidade() {
  const city = trimValue(state.registro.municipio_nascimento);
  const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
  setBoundValue("registro.municipio_naturalidade", city);
  setBoundValue("registro.uf_naturalidade", uf);
  naturalidadeMemo = { city, uf };
  naturalidadeEdited = false;
}
function syncNaturalidadeLockedToBirth() {
  if (state.ui.naturalidade_diferente) return;
  const city = trimValue(state.registro.municipio_nascimento);
  const uf = trimValue(state.registro.uf_nascimento).toUpperCase();
  setBoundValue("registro.municipio_naturalidade", city);
  setBoundValue("registro.uf_naturalidade", uf);
}
function updateNaturalidadeVisibility(fromToggle) {
  const isDifferent = !!state.ui.naturalidade_diferente;
  const row = byId("naturalidade-extra");
  if (row) {
    row.classList.toggle("visible", isDifferent);
    row.style.display = isDifferent ? "flex" : "none";
    row.hidden = false;
  }
  const copyBtn = byId("copy-naturalidade");
  if (copyBtn) copyBtn.disabled = !isDifferent;
  const labelCity = byId("label-municipio-principal");
  const labelUf = byId("label-uf-principal");
  if (labelCity) setText(labelCity, isDifferent ? "Municipio de nascimento" : "Municipio (nascimento e naturalidade)");
  if (labelUf) setText(labelUf, isDifferent ? "UF de nascimento" : "UF (nascimento e naturalidade)");
  if (!fromToggle) return;
  if (isDifferent) {
    if (naturalidadeEdited && (naturalidadeMemo.city || naturalidadeMemo.uf)) {
      setBoundValue("registro.municipio_naturalidade", naturalidadeMemo.city);
      setBoundValue("registro.uf_naturalidade", naturalidadeMemo.uf);
    } else {
      copyBirthToNaturalidade();
    }
  } else {
    naturalidadeMemo = {
      city: trimValue(state.registro.municipio_naturalidade),
      uf: trimValue(state.registro.uf_naturalidade)
    };
    syncNaturalidadeLockedToBirth();
  }
  updateDirty();
}
function updateCpfState() {
  const cpfDigits = normalizeCpfValue(state.registro.cpf || "");
  state.registro.cpf = cpfDigits;
  if (cpfDigits.length > 0) {
    state.registro.cpf_sem_inscricao = false;
    const cpfSemEl = byId("cpf-sem");
    if (cpfSemEl) cpfSemEl.checked = false;
  }
  const cpfEl = byId("cpf");
  if (cpfEl) cpfEl.value = formatCpf2(cpfDigits);
}
function updateCpfFromToggle() {
  const cpfSem = !!state.registro.cpf_sem_inscricao;
  const cpfEl = byId("cpf");
  if (cpfSem && cpfEl) {
    cpfEl.value = "";
    state.registro.cpf = "";
  }
}
var CNS_CARTORIOS = {
  "6": "110742",
  "9": "163659",
  "12": "110064",
  "13": "109736",
  "14": "110635",
  "15": "110072"
};
function digitsOnly4(value) {
  return (value || "").replace(/\D/g, "");
}
function padDigits(value, size) {
  const digits = digitsOnly4(value);
  if (!digits) return "";
  return digits.padStart(size, "0").slice(-size);
}
function ensureHint(input) {
  const field = input.closest(".field");
  if (!field) return null;
  let hint = field.querySelector(".hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "hint";
    field.appendChild(hint);
  }
  return hint;
}
function setFieldError(input, message) {
  input.classList.toggle("invalid", !!message);
  const hint = ensureHint(input);
  if (!hint) return;
  hint.textContent = message || "";
  hint.classList.toggle("visible", !!message);
}
function clearFieldHint(input) {
  var _a;
  const field = (_a = input == null ? void 0 : input.closest) == null ? void 0 : _a.call(input, ".field");
  if (!field) return;
  const hint = field.querySelector(".hint");
  if (!hint) return;
  hint.textContent = "";
  hint.classList.remove("visible");
}
function validateDateInputValue(value) {
  const digits = digitsOnly4(value);
  if (!digits) return "";
  if (digits.length >= 2) {
    const day = Number(digits.slice(0, 2));
    if (day < 1 || day > 31) return "Dia invalido";
  }
  if (digits.length >= 4) {
    const month = Number(digits.slice(2, 4));
    if (month < 1 || month > 12) return "Mes invalido";
  }
  if (digits.length === 8 && !isValidDate(formatDateInput(value))) return "Data invalida";
  return "";
}
function validateTimeInputValue(value) {
  const digits = digitsOnly4(value);
  if (!digits) return "";
  if (digits.length >= 2) {
    const hour = Number(digits.slice(0, 2));
    if (hour > 23) return "Hora invalida";
  }
  if (digits.length >= 4) {
    const minute = Number(digits.slice(2, 4));
    if (minute > 59) return "Minutos invalidos";
  }
  if (digits.length === 4 && !isValidTime(formatTimeInput(value))) return "Hora invalida";
  return "";
}
function validateLiveField(path, input) {
  if (!input) return;
  if (path === "registro.data_registro" || path === "registro.data_nascimento") {
    setFieldError(input, validateDateInputValue(input.value));
    return;
  }
  if (path === "registro.hora_nascimento") {
    setFieldError(input, validateTimeInputValue(input.value));
    return;
  }
  if (path === "registro.cpf") {
    const digits = normalizeCpfValue(input.value);
    const invalid = !state.registro.cpf_sem_inscricao && !cpf.isValid(digits);
    input.classList.toggle("invalid", invalid);
    clearFieldHint(input);
    return;
  }
  if (path === "ui.cartorio_oficio") {
    const invalid = !state.ui.cartorio_oficio;
    input.classList.toggle("invalid", invalid);
    clearFieldHint(input);
  }
}
function yearFromDate(value) {
  const normalized = normalizeDateValue(value);
  const match = (normalized || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : "";
}
function tipoDigit() {
  let registro = (state.certidao.tipo_registro || "").toString();
  if (!registro) {
    if (document.getElementById("form-casamento")) registro = "casamento";
    else if (document.getElementById("form-obito")) registro = "obito";
    else if (document.getElementById("form-nascimento")) registro = "nascimento";
  }
  if (registro === "nascimento") return "1";
  if (registro === "casamento") {
    const raw = String(state.ui.casamento_tipo || "").trim();
    if (raw === "2") return "2";
    if (raw === "3") return "3";
    if (!raw) return "";
    const first = raw[0].toUpperCase();
    if (first === "2" || first === "3") return first;
    if (first === "C") return "2";
    if (first === "R") return "3";
    if (raw.toLowerCase().startsWith("civil")) return "2";
    if (raw.toLowerCase().startsWith("relig")) return "3";
    const selected = digitsOnly4(raw).slice(0, 1);
    return selected || "";
  }
  if (registro === "obito") return "4";
  return "";
}
function dvMatricula(base30) {
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
function buildMatriculaParts() {
  const cns = digitsOnly4(state.certidao.cartorio_cns || "");
  const ano = yearFromDate(state.registro.data_registro || "");
  const tipo = tipoDigit();
  const livro = padDigits(state.ui.matricula_livro || "", 5);
  const folha = padDigits(state.ui.matricula_folha || "", 3);
  const termo = padDigits(state.ui.matricula_termo || "", 7);
  if (cns.length !== 6 || !ano || !tipo || !livro || !folha || !termo) {
    return { base: "", dv: "", final: "" };
  }
  const base30 = `${cns}0155${ano}${tipo}${livro}${folha}${termo}`;
  if (base30.length !== 30) return { base: "", dv: "", final: "" };
  const dv = dvMatricula(base30);
  return { base: base30, dv, final: dv ? base30 + dv : "" };
}
function updateMatricula() {
  const parts = buildMatriculaParts();
  state.registro.matricula = parts.final || "";
  const matEl = byId("matricula");
  if (matEl) matEl.value = parts.final || "";
}
function applyCartorioChange() {
  const oficio = state.ui.cartorio_oficio || "";
  state.certidao.cartorio_cns = "163659";
  const cnsInput = document.querySelector('[data-bind="certidao.cartorio_cns"]');
  if (cnsInput) {
    cnsInput.value = "163659";
    cnsInput.readOnly = true;
  }
  const cnsMatricula = CNS_CARTORIOS[oficio];
  state.registro.cartorio_cns_matricula = cnsMatricula || "";
  updateMatricula();
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
var store = createKeyValueStore({ storageKeyPrefix: "" });
var draftKey = "draft_certidao";
async function saveDraft() {
  const data = normalizeData();
  if (!validateData(data, setStatus, { tipoRegistro: state.certidao.tipo_registro, casamentoTipo: state.ui.casamento_tipo })) return;
  recordPlaceMappingFromState();
  try {
    if (window.api && window.api.dbSaveDraft) {
      const res = await window.api.dbSaveDraft({
        id: lastSavedId || null,
        data,
        sourceFormat: "manual",
        kind: data.certidao.tipo_registro || "nascimento"
      });
      if (res && res.id) lastSavedId = res.id;
    } else {
      store.setItem(draftKey, JSON.stringify(data));
    }
    lastSavedSnapshot = computeSnapshot();
    setDirty(false);
    setStatus("Salvo");
  } catch {
    setStatus("Falha ao salvar", true);
  }
}
async function generateFile(format2) {
  const data = normalizeData();
  if (!validateData(data, setStatus, { tipoRegistro: state.certidao.tipo_registro, casamentoTipo: state.ui.casamento_tipo })) return;
  const ext = format2 === "xml" ? "xml" : "json";
  const name = buildFileName(data, ext);
  let content = "";
  if (format2 === "xml") {
    const root = `certidao_${data.certidao.tipo_registro || "registro"}`;
    content = toXml(data, root, 0);
  } else {
    content = JSON.stringify(data, null, 2);
  }
  try {
    if (format2 === "xml" && window.api && window.api.saveXml) {
      const p = await window.api.saveXml({ name, content });
      setStatus(`XML salvo: ${p || name}`);
    } else if (format2 === "json" && window.api && window.api.saveJson) {
      const p = await window.api.saveJson({ name, content });
      setStatus(`JSON salvo: ${p || name}`);
    } else {
      const mime = format2 === "xml" ? "application/xml" : "application/json";
      if (downloadFile(name, content, mime)) {
        setStatus(`${format2.toUpperCase()} baixado: ${name}`);
      } else {
        setStatus("API indisponivel", true);
      }
    }
  } catch {
    setStatus("Falha ao gerar arquivo", true);
  }
}
function dateToTime(value) {
  const normalized = normalizeDateValue(value);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}
function updateDebug(data) {
  var _a, _b;
  const parts = buildMatriculaParts();
  const baseEl = byId("debug-matricula-base");
  const dvEl = byId("debug-matricula-dv");
  const finalEl = byId("debug-matricula-final");
  if (baseEl) baseEl.value = parts.base || "";
  if (dvEl) dvEl.value = parts.dv || "";
  if (finalEl) finalEl.value = parts.final || "";
  const invalidEl = byId("debug-invalid");
  const invalids = collectInvalidFields(document);
  if (invalidEl) invalidEl.value = invalids.join("\n");
  const alerts = [];
  const dr = dateToTime(((_a = data == null ? void 0 : data.registro) == null ? void 0 : _a.data_registro) || "");
  const dn = dateToTime(((_b = data == null ? void 0 : data.registro) == null ? void 0 : _b.data_nascimento) || "");
  if (dr && dn && dn > dr) alerts.push("Data de nascimento maior que data de registro.");
  const alertsEl = byId("debug-alerts");
  if (alertsEl) alertsEl.value = alerts.join("\n");
}
function updateOutputs() {
  const jsonEl = byId("json-output");
  const xmlEl = byId("xml-output");
  if (!jsonEl && !xmlEl) return;
  const data = normalizeData();
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  if (xmlEl) {
    const root = `certidao_${data.certidao.tipo_registro || "registro"}`;
    xmlEl.value = toXml(data, root, 0);
  }
  updateDebug(data);
}
function updateBadge() {
  const badge = byId("outputDirBadge");
  if (!badge) return;
  const json = currentDirs.jsonDir || "...";
  const xml = currentDirs.xmlDir || "...";
  badge.textContent = `JSON: ${json} | XML: ${xml}`;
}
async function refreshConfig() {
  if (!window.api || !window.api.getConfig) return;
  try {
    const cfg = await window.api.getConfig();
    currentDirs = { jsonDir: cfg.jsonDir || "", xmlDir: cfg.xmlDir || "" };
    updateBadge();
    const jsonEl = byId("json-dir");
    const xmlEl = byId("xml-dir");
    if (jsonEl) jsonEl.value = currentDirs.jsonDir;
    if (xmlEl) xmlEl.value = currentDirs.xmlDir;
  } catch {
    setStatus("Falha ao ler config", true);
  }
}
function setupConfigPanel() {
  var _a, _b, _c;
  refreshConfig();
  const radios = qsa('input[name="name-validation-mode"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === nameValidationMode;
  });
  (_a = byId("config-save")) == null ? void 0 : _a.addEventListener("click", () => {
    const selected = qs('input[name="name-validation-mode"]:checked');
    if (selected && selected.value) {
      nameValidationMode = selected.value;
      localStorage.setItem(NAME_MODE_KEY, nameValidationMode);
    }
    updateBadge();
  });
  (_b = byId("pick-json")) == null ? void 0 : _b.addEventListener("click", async () => {
    if (!window.api || !window.api.pickJsonDir) return;
    const dir = await window.api.pickJsonDir();
    const jsonEl = byId("json-dir");
    if (jsonEl) jsonEl.value = dir;
    currentDirs.jsonDir = dir;
    updateBadge();
  });
  (_c = byId("pick-xml")) == null ? void 0 : _c.addEventListener("click", async () => {
    if (!window.api || !window.api.pickXmlDir) return;
    const dir = await window.api.pickXmlDir();
    const xmlEl = byId("xml-dir");
    if (xmlEl) xmlEl.value = dir;
    currentDirs.xmlDir = dir;
    updateBadge();
  });
  setupAdminPanel();
}
function setupActions() {
  var _a, _b, _c;
  (_a = byId("btn-save")) == null ? void 0 : _a.addEventListener("click", saveDraft);
  (_b = byId("btn-json")) == null ? void 0 : _b.addEventListener("click", () => generateFile("json"));
  (_c = byId("btn-xml")) == null ? void 0 : _c.addEventListener("click", () => generateFile("xml"));
}
var placeAutofill = null;
var placeCache = null;
function recordPlaceMappingFromState(placeTextOverride) {
  if (!placeCache) return;
  const localEl = byId("local-nascimento");
  const placeText = trimValue(placeTextOverride || (localEl == null ? void 0 : localEl.value));
  if (!placeText) return;
  const cityBirth = trimValue(state.registro.municipio_nascimento);
  const ufBirth = trimValue(state.registro.uf_nascimento).toUpperCase();
  const cityNatural = state.ui.naturalidade_diferente ? trimValue(state.registro.municipio_naturalidade) : "";
  const ufNatural = state.ui.naturalidade_diferente ? trimValue(state.registro.uf_naturalidade).toUpperCase() : "";
  if (!cityBirth || !ufBirth) return;
  placeCache.recordMapping({ placeText, cityBirth, ufBirth, cityNatural, ufNatural });
}
function setupNaturalidadeToggle() {
  const toggle = byId("naturalidade-diferente");
  if (!toggle) return;
  toggle.addEventListener("change", () => {
    state.ui.naturalidade_diferente = !!toggle.checked;
    updateNaturalidadeVisibility(true);
    updateDirty();
  });
}
function setupShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      saveDraft();
    }
  });
}
function setupActSelect() {
  const select = byId("ato-select");
  if (!select) return;
  select.value = "nascimento";
  select.addEventListener("change", () => {
    const value = select.value;
    const map = {
      nascimento: "./Nascimento2Via.html",
      casamento: "./Casamento2Via.html",
      obito: "./Obito2Via.html"
    };
    const next = map[value];
    if (next) window.location.href = next;
  });
}
function setupCartorioTyping() {
  const select = byId("cartorio-oficio");
  if (!select) return;
  let buffer = "";
  let timer = null;
  const clearBuffer = () => {
    buffer = "";
    if (timer) clearTimeout(timer);
    timer = null;
  };
  select.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key >= "0" && key <= "9") {
      e.preventDefault();
      buffer += key;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        buffer = "";
      }, 700);
      const match = Array.from(select.options).find((opt) => opt.value === buffer);
      if (match) {
        select.value = buffer;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        clearBuffer();
      }
      return;
    }
    if (key === "Backspace") {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      return;
    }
  });
}
function setupNameValidation() {
  const validator = createNameValidator();
  const fields = qsa("[data-name-validate]");
  const timers = /* @__PURE__ */ new Map();
  fields.forEach((input) => {
    const field = input.closest(".field");
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
      const field = input.closest(".field");
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
function setupBeforeUnload() {
  window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
}
function onPathChange(path) {
  if (path === "registro.sexo") updateSexoOutros();
  if (path === "registro.data_nascimento_ignorada" || path === "registro.hora_nascimento_ignorada") updateIgnoreFields();
  if (path === "registro.cpf") updateCpfState();
  if (path === "registro.cpf_sem_inscricao") updateCpfFromToggle();
  if (path === "ui.cartorio_oficio") applyCartorioChange();
  if (path === "registro.data_registro") updateMatricula();
  if (path === "ui.casamento_tipo" || path === "ui.matricula_livro" || path === "ui.matricula_folha" || path === "ui.matricula_termo") updateMatricula();
  if (path === "ui.naturalidade_diferente") updateNaturalidadeVisibility(true);
  if (path === "registro.municipio_naturalidade" || path === "registro.uf_naturalidade") rememberNaturalidadeEdit();
  if (path === "registro.municipio_nascimento" || path === "registro.uf_nascimento") syncNaturalidadeLockedToBirth();
  const liveInput = qs(`[data-bind="${path}"]`);
  if (liveInput) validateLiveField(path, liveInput);
  if (path === "registro.cpf_sem_inscricao") {
    const cpfEl = byId("cpf");
    if (cpfEl) validateLiveField("registro.cpf", cpfEl);
  }
  updateOutputs();
  updateDirty();
}
async function bootstrap() {
  state.certidao.tipo_registro = "nascimento";
  syncInputsFromState();
  updateTipoButtons();
  updateSexoOutros();
  updateIgnoreFields();
  updateNaturalidadeVisibility(false);
  updateCpfState();
  updateMatricula();
  bindDataBindInputs(onPathChange);
  setupMasks();
  setupActions();
  setupConfigPanel();
  setupDrawer({ defaultTab: "tab-config" });
  setupActSelect();
  placeAutofill = createPlaceAutofill({
    state,
    setBoundValue,
    updateDirty,
    syncNaturalidadeLockedToBirth,
    copyBirthToNaturalidade,
    recordPlaceMappingFromState
  });
  placeCache = placeAutofill.placeCache;
  placeAutofill.setupLocalAutofill();
  setupNaturalidadeToggle();
  setupShortcuts();
  setupPrimaryShortcut(() => byId("btn-save") || byId("btn-json"));
  setupCartorioTyping();
  setupNameValidation();
  setupBeforeUnload();
  validateLiveField("registro.cpf", byId("cpf"));
  validateLiveField("ui.cartorio_oficio", qs('[data-bind="ui.cartorio_oficio"]'));
  updateDirty();
  updateOutputs();
}
bootstrap();

// ui/ts/acts/casamento/casamento.ts
var NAME_MODE_KEY2 = "ui.nameValidationMode";
var nameValidationMode2 = localStorage.getItem(NAME_MODE_KEY2) || "input";
var PANEL_INLINE_KEY = "ui.panelInline";
function setupSettingsPanelCasamento() {
  const select = document.getElementById("settings-drawer-position");
  const cbCpf = document.getElementById("settings-enable-cpf");
  const cbName = document.getElementById("settings-enable-name");
  const saveBtn = document.getElementById("settings-save");
  const applyBtn = document.getElementById("settings-apply");
  const pos = localStorage.getItem("ui.drawerPosition") || "bottom-right";
  const enableCpf = localStorage.getItem("ui.enableCpfValidation") !== "false";
  const enableName = localStorage.getItem("ui.enableNameValidation") !== "false";
  if (select) select.value = pos;
  if (cbCpf) cbCpf.checked = !!enableCpf;
  if (cbName) cbName.checked = !!enableName;
  saveBtn == null ? void 0 : saveBtn.addEventListener("click", () => {
    var _a;
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    const newCpf = (cbCpf == null ? void 0 : cbCpf.checked) ? "true" : "false";
    const newName = (cbName == null ? void 0 : cbName.checked) ? "true" : "false";
    const newInline = ((_a = document.getElementById("settings-panel-inline")) == null ? void 0 : _a.checked) ? "true" : "false";
    localStorage.setItem("ui.drawerPosition", newPos);
    localStorage.setItem("ui.enableCpfValidation", newCpf);
    localStorage.setItem("ui.enableNameValidation", newName);
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
    setStatus2("Prefer\xEAncias salvas. Atualizando...", false);
    setTimeout(() => window.location.reload(), 300);
  });
  applyBtn == null ? void 0 : applyBtn.addEventListener("click", () => {
    const newPos = (select == null ? void 0 : select.value) || "bottom-right";
    applyDrawerPosition(newPos);
    setStatus2("Posi\xE7\xE3o aplicada (n\xE3o salva)", false);
  });
}
function setStatus2(text, isError) {
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
function escapeXml2(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function toXml2(obj, nodeName, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === void 0) return `${pad}<${nodeName}></${nodeName}>`;
  if (typeof obj !== "object") return `${pad}<${nodeName}>${escapeXml2(obj)}</${nodeName}>`;
  if (Array.isArray(obj)) return obj.map((item) => toXml2(item, nodeName, indent)).join("\n");
  const children = Object.keys(obj).map((key) => toXml2(obj[key], key, indent + 1)).join("\n");
  return `${pad}<${nodeName}>
${children}
${pad}</${nodeName}>`;
}
function downloadFile2(name, content, mime) {
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
function makeTimestamp2() {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function buildFileName2(ext) {
  return `CASAMENTO_${makeTimestamp2()}.${ext}`;
}
function generateJson() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const json = JSON.stringify(data, null, 2);
  const out = document.getElementById("json-output");
  if (out) out.value = json;
  const name = buildFileName2("json");
  if (downloadFile2(name, json, "application/json")) setStatus2(`JSON baixado: ${name}`);
  else setStatus2("Falha ao gerar JSON", true);
}
function generateXml() {
  if (!canProceed()) return;
  const data = mapperHtmlToJson(document);
  const xml = toXml2(data, "certidao_casamento", 0);
  const name = buildFileName2("xml");
  if (downloadFile2(name, xml, "application/xml")) setStatus2(`XML baixado: ${name}`);
  else setStatus2("Falha ao gerar XML", true);
}
function showToast2(message) {
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
function setupConfigPanel2() {
  var _a;
  const radios = document.querySelectorAll('input[name="name-validation-mode"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === nameValidationMode2;
  });
  const cbInline = document.getElementById("settings-panel-inline");
  const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
  if (cbInline) cbInline.checked = panelInlineStored === null ? false : panelInlineStored === "true";
  (_a = document.getElementById("config-save")) == null ? void 0 : _a.addEventListener("click", () => {
    var _a2;
    const selected = document.querySelector('input[name="name-validation-mode"]:checked');
    if (selected && selected.value) {
      nameValidationMode2 = selected.value;
      localStorage.setItem(NAME_MODE_KEY2, nameValidationMode2);
    }
    const newInline = ((_a2 = document.getElementById("settings-panel-inline")) == null ? void 0 : _a2.checked) ? "true" : "false";
    localStorage.setItem(PANEL_INLINE_KEY, newInline);
  });
  setupAdminPanel();
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
function clearFieldHint2(field) {
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
function setupActSelect2() {
  const select = document.getElementById("ato-select");
  if (!select) return;
  select.value = "casamento";
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
function yearFromDate2(value) {
  const normalized = normalizeDate(value);
  const match = (normalized || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] : "";
}
function dateToTime2(value) {
  const normalized = normalizeDate(value);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}
function updateDebug2(data) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const cns = ((_a = document.querySelector('input[name="certidao.cartorio_cns"]')) == null ? void 0 : _a.value) || "";
  const ano = yearFromDate2(((_b = document.querySelector('input[name="dataTermo"]')) == null ? void 0 : _b.value) || "");
  const tipo = ((_c = document.querySelector('select[name="tipoCasamento"]')) == null ? void 0 : _c.value) || "";
  const tipoAto = tipo === "R" ? "3" : tipo === "C" ? "2" : "";
  const livro = ((_d = document.querySelector('input[name="livro"]')) == null ? void 0 : _d.value) || "";
  const folha = ((_e = document.querySelector('input[name="folha"]')) == null ? void 0 : _e.value) || "";
  const termo = ((_f = document.querySelector('input[name="termo"]')) == null ? void 0 : _f.value) || "";
  const base = buildMatriculaBase30({
    cns6: cns,
    ano,
    tipoAto,
    acervo: "01",
    servico: "55",
    livro,
    folha,
    termo
  });
  const dv = base ? calcDv2Digits(base) : "";
  const final = base && dv ? base + dv : buildMatriculaFinal({ cns6: cns, ano, tipoAto, livro, folha, termo });
  const baseEl = document.getElementById("debug-matricula-base");
  if (baseEl) baseEl.value = base || "";
  const dvEl = document.getElementById("debug-matricula-dv");
  if (dvEl) dvEl.value = dv || "";
  const finalEl = document.getElementById("debug-matricula-final");
  if (finalEl) finalEl.value = final || "";
  const invalids = collectInvalidFields(document);
  const invalidEl = document.getElementById("debug-invalid");
  if (invalidEl) invalidEl.value = invalids.join("\n");
  const alerts = [];
  const termoDate = dateToTime2(((_g = data == null ? void 0 : data.registro) == null ? void 0 : _g.data_registro) || "");
  const casamentoDate = dateToTime2(((_h = data == null ? void 0 : data.registro) == null ? void 0 : _h.data_celebracao) || "");
  if (termoDate && casamentoDate && termoDate < casamentoDate) {
    alerts.push("Data do termo menor que data do casamento.");
  }
  const alertsEl = document.getElementById("debug-alerts");
  if (alertsEl) alertsEl.value = alerts.join("\n");
}
function updateOutputs2() {
  const data = mapperHtmlToJson(document);
  const jsonEl = document.getElementById("json-output");
  if (jsonEl) jsonEl.value = JSON.stringify(data, null, 2);
  const xmlEl = document.getElementById("xml-output");
  if (xmlEl) xmlEl.value = toXml2(data, "certidao_casamento", 0);
  updateDebug2(data);
}
function setupLiveOutputs() {
  const form = document.getElementById("form-casamento");
  const drawer = document.getElementById("drawer");
  const handler = () => updateOutputs2();
  form == null ? void 0 : form.addEventListener("input", handler);
  form == null ? void 0 : form.addEventListener("change", handler);
  drawer == null ? void 0 : drawer.addEventListener("input", handler);
  drawer == null ? void 0 : drawer.addEventListener("change", handler);
  updateOutputs2();
}
function setupNameValidation2() {
  const validator = createNameValidator();
  const fields = document.querySelectorAll("[data-name-validate]");
  const timers = /* @__PURE__ */ new Map();
  fields.forEach((input) => {
    const field = input.closest(".campo");
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
        showToast2("Nome possivelmente incorreto");
        if (!timers.has(input)) {
          const id = setInterval(() => {
            if (input.classList.contains("invalid")) showToast2("Nome possivelmente incorreto");
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
      if (nameValidationMode2 === "input") runCheck();
    });
    input.addEventListener("blur", () => {
      if (nameValidationMode2 === "blur" || nameValidationMode2 === "input") runCheck();
    });
  });
  validator.ready.then(() => {
    fields.forEach((input) => {
      const field = input.closest(".campo");
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
  var _a, _b, _c, _d;
  function triggerMatricula() {
    try {
      if (typeof window.updateMatricula === "function") window.updateMatricula();
    } catch {
    }
  }
  const elTipo = document.querySelector('select[name="tipoCasamento"]');
  const elDataTermo = document.querySelector('input[name="dataTermo"]');
  const elDataCasamento = document.querySelector('input[name="dataCasamento"]');
  const elRegimeBens = document.querySelector('select[name="regimeBens"]');
  function syncDataCasamentoState() {
    if (!elTipo || !elDataTermo || !elDataCasamento) return;
    if (elTipo.value === "3") {
      elDataCasamento.removeAttribute("readonly");
      elDataCasamento.style.background = "";
      elDataCasamento.tabIndex = 0;
      if (elDataCasamento.value === elDataTermo.value || elDataCasamento.hasAttribute("readonly")) {
        elDataCasamento.value = "";
        setTimeout(() => elDataCasamento.focus(), 10);
      }
      elDataCasamento.style.outline = "2px solid #22c55e";
      elDataCasamento.title = "readonly: " + elDataCasamento.hasAttribute("readonly");
    } else {
      elDataCasamento.setAttribute("readonly", "readonly");
      elDataCasamento.style.background = "#ddd";
      elDataCasamento.tabIndex = -1;
      elDataCasamento.value = elDataTermo.value;
      elDataCasamento.style.outline = "";
      elDataCasamento.title = "";
      if (document.activeElement === elDataCasamento && elRegimeBens) elRegimeBens.focus();
    }
    triggerMatricula();
  }
  elTipo == null ? void 0 : elTipo.addEventListener("change", syncDataCasamentoState);
  try {
    if (elTipo) elTipo.required = true;
  } catch (e) {
  }
  elDataTermo == null ? void 0 : elDataTermo.addEventListener("input", () => {
    if (elTipo.value !== "3") {
      elDataCasamento.value = elDataTermo.value;
      if (elTipo.value === "3") startEnforceUnlock();
      else stopEnforceUnlock();
      triggerMatricula();
    }
  });
  elDataCasamento == null ? void 0 : elDataCasamento.addEventListener("input", () => {
    if (elTipo.value === "3" && elDataCasamento.value.length === 10 && elRegimeBens) {
      elRegimeBens.focus();
    }
    triggerMatricula();
  });
  let enforceInterval = null;
  const dataCasamentoObserver = new MutationObserver((mutations) => {
    const tipoVal = (elTipo == null ? void 0 : elTipo.value) || "";
    if (tipoVal === "3") {
      if (elDataCasamento.hasAttribute("readonly") || elDataCasamento.tabIndex === -1 || elDataCasamento.classList.contains("input-locked")) {
        unlockDataCasamento();
      }
    } else {
      if (!elDataCasamento.hasAttribute("readonly")) {
        lockDataCasamento();
      }
    }
  });
  function startEnforceUnlock() {
    if (enforceInterval != null) return;
    enforceInterval = window.setInterval(() => {
      if (elTipo.value === "3") {
        unlockDataCasamento();
      } else {
        lockDataCasamento();
      }
    }, 350);
  }
  function stopEnforceUnlock() {
    if (enforceInterval != null) {
      clearInterval(enforceInterval);
      enforceInterval = null;
    }
  }
  function lockDataCasamento() {
    try {
      elDataCasamento.setAttribute("readonly", "readonly");
      elDataCasamento.tabIndex = -1;
      elDataCasamento.style.background = "#ddd";
      if (!elDataCasamento.classList.contains("input-locked")) elDataCasamento.classList.add("input-locked");
    } catch (e) {
    }
  }
  function unlockDataCasamento() {
    try {
      elDataCasamento.removeAttribute("readonly");
      elDataCasamento.tabIndex = 0;
      elDataCasamento.style.background = "";
      elDataCasamento.classList.remove("input-locked");
    } catch (e) {
    }
  }
  function findMatriculaFieldLocal() {
    const byId2 = document.getElementById("matricula");
    if (byId2) return byId2;
    const byName = document.querySelector('input[name*="matricula"], input[id*="matricula"]');
    if (byName) return byName;
    const byDataBind = Array.from(document.querySelectorAll("input[data-bind]")).find((i) => (i.getAttribute("data-bind") || "").toLowerCase().includes("matricula")) || null;
    return byDataBind;
  }
  function fixMatriculaField(mEl) {
    if (!mEl) return;
    const val = (mEl.value || "").trim();
    if (!val || !/^\d+$/.test(val)) return;
    if (val.length <= 14) return;
    const tipo = (elTipo == null ? void 0 : elTipo.value) || "";
    const desired = tipo === "3" ? "3" : tipo === "2" ? "2" : null;
    if (!desired) return;
    if (val[14] === desired) return;
    const newVal = val.slice(0, 14) + desired + val.slice(15);
    mEl.value = newVal;
    try {
      mEl.dispatchEvent(new Event("input", { bubbles: true }));
      mEl.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
    }
  }
  function observeMatricula() {
    const mEl = findMatriculaFieldLocal();
    if (!mEl) return;
    mEl.addEventListener("input", () => fixMatriculaField(mEl));
    mEl.addEventListener("change", () => fixMatriculaField(mEl));
    try {
      const mo = new MutationObserver(() => fixMatriculaField(mEl));
      mo.observe(mEl, { attributes: true, attributeFilter: ["value"] });
    } catch (e) {
    }
    let last = mEl.value;
    let blockInterval = null;
    function startBlockingUntilTipo() {
      if (blockInterval != null) return;
      blockInterval = window.setInterval(() => {
        if (((elTipo == null ? void 0 : elTipo.value) || "").trim() === "") {
          if (mEl.value) {
            mEl.value = "";
            try {
              mEl.dispatchEvent(new Event("input", { bubbles: true }));
            } catch (e) {
            }
          }
          mEl.setAttribute("readonly", "readonly");
          mEl.placeholder = "Selecione o tipo antes";
        } else {
          if (blockInterval != null) {
            clearInterval(blockInterval);
            blockInterval = null;
          }
          try {
            mEl.removeAttribute("readonly");
          } catch (e) {
          }
          mEl.placeholder = "";
          fixMatriculaField(mEl);
        }
      }, 300);
    }
    if (((elTipo == null ? void 0 : elTipo.value) || "").trim() === "") startBlockingUntilTipo();
    setInterval(() => {
      if (mEl.value !== last) {
        last = mEl.value;
        fixMatriculaField(mEl);
      }
    }, 500);
  }
  ["cartorio-oficio", "matricula-livro", "matricula-folha", "matricula-termo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", triggerMatricula);
    if (el) el.addEventListener("change", triggerMatricula);
  });
  setTimeout(() => {
    syncDataCasamentoState();
    try {
      dataCasamentoObserver.observe(elDataCasamento, { attributes: true, attributeFilter: ["readonly", "class", "tabindex", "disabled", "style"] });
    } catch (e) {
    }
    observeMatricula();
  }, 50);
  (_a = document.getElementById("btn-json")) == null ? void 0 : _a.addEventListener("click", (e) => {
    e.preventDefault();
    generateJson();
  });
  (_b = document.getElementById("btn-xml")) == null ? void 0 : _b.addEventListener("click", (e) => {
    e.preventDefault();
    generateXml();
  });
  setupValidation();
  setupNameValidation2();
  setupConfigPanel2();
  setupDrawer({ defaultTab: "tab-config" });
  setupSettingsPanelCasamento();
  (function() {
    const panelInlineStored = localStorage.getItem(PANEL_INLINE_KEY);
    const useInline = panelInlineStored === null ? false : panelInlineStored === "true";
    const inline = document.getElementById("panel-inline");
    const drawer = document.getElementById("drawer");
    const body = drawer == null ? void 0 : drawer.querySelector(".drawer-body");
    if (!inline) return;
    if (useInline) {
      if (body) while (body.firstChild) inline.appendChild(body.firstChild);
      const toggle = document.getElementById("drawer-toggle");
      if (toggle) toggle.style.display = "none";
    } else {
      const toggle = document.getElementById("drawer-toggle");
      if (toggle) toggle.style.display = "inline-flex";
    }
    const btn = document.getElementById("drawer-toggle");
    if (btn) btn.addEventListener("click", () => {
      const d = document.getElementById("drawer");
      if (!d) return;
      d.classList.toggle("open");
    });
  })();
  setupActSelect2();
  setupPrimaryShortcut(() => document.getElementById("btn-json") || document.getElementById("btn-xml"));
  setupNameCopy('input[name="nomeSolteiro"]', 'input[name="nomeCasado"]');
  setupNameCopy('input[name="nomeSolteira"]', 'input[name="nomeCasada"]');
  setupAutoNationality('input[name="nacionalidadeNoivo"]', "BRASILEIRO");
  setupAutoNationality('input[name="nacionalidadeNoiva"]', "BRASILEIRA");
  setupCasamentoDates();
  setupFocusEmphasis();
  setupLiveOutputs();
  updateActionButtons();
  (_c = document.getElementById("form-casamento")) == null ? void 0 : _c.addEventListener("input", updateActionButtons);
  (_d = document.getElementById("form-casamento")) == null ? void 0 : _d.addEventListener("change", updateActionButtons);
}
function setupValidation() {
  document.querySelectorAll("input[data-date]").forEach((input) => {
    const field = input.closest(".campo");
    const required = input.hasAttribute("data-required");
    const onInput = () => {
      applyDateMask(input);
      clearFieldHint2(field);
      const normalized = normalizeDate(input.value);
      const isValid2 = !input.value || !!normalized;
      const state2 = getFieldState({ required, value: input.value, isValid: isValid2 });
      applyFieldState(field, state2);
    };
    const onBlur = () => {
      applyDateMask(input);
      const raw = input.value || "";
      const res = validateDateDetailed(raw);
      const isValid2 = res.ok;
      const state2 = getFieldState({ required, value: raw, isValid: isValid2 });
      applyFieldState(field, state2);
      if (!isValid2 && raw) setFieldHint(field, res.message || "Data inv\xE1lida");
      else clearFieldHint2(field);
    };
    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    onInput();
  });
  document.querySelectorAll("[data-name-validate]").forEach((input) => {
    const field = input.closest(".campo");
    const required = input.hasAttribute("data-required");
    const handler = () => {
      const res = validateName(input.value, { minWords: 2 });
      const state2 = getFieldState({
        required,
        value: input.value,
        isValid: !res.invalid,
        warn: res.warn
      });
      applyFieldState(field, state2);
    };
    input.addEventListener("input", handler);
    input.addEventListener("blur", handler);
    handler();
  });
  document.querySelectorAll("input[data-cpf]").forEach((input) => {
    const field = input.closest(".campo");
    const required = input.hasAttribute("data-required");
    const handler = () => {
      input.value = formatCpfInput(input.value);
      const digits = normalizeCpf(input.value);
      const isValid2 = !digits || isValidCpf(digits);
      const state2 = getFieldState({ required, value: digits ? input.value : "", isValid: isValid2 });
      applyFieldState(field, state2);
    };
    input.addEventListener("input", handler);
    input.addEventListener("blur", () => {
      handler();
      const digits = normalizeCpf(input.value);
      if (input.value && (!digits || !isValidCpf(digits))) setFieldHint(field, "CPF inv\xE1lido");
      else clearFieldHint2(field);
    });
    handler();
  });
}
function canProceed() {
  const invalids = collectInvalidFields(document);
  if (!invalids || invalids.length === 0) return true;
  setStatus2(`${invalids.length} campo(s) inv\xE1lido(s). Corrija antes de prosseguir.`, true);
  showToast2("Existem campos inv\xE1lidos \u2014 corrija antes de prosseguir");
  const invalidEl = document.getElementById("debug-invalid");
  if (invalidEl) invalidEl.value = invalids.join("\n");
  return false;
}
function updateActionButtons() {
  const invalids = collectInvalidFields(document);
  const disabled = !!(invalids && invalids.length > 0);
  const btnJson = document.getElementById("btn-json");
  if (btnJson) btnJson.disabled = disabled;
  const btnXml = document.getElementById("btn-xml");
  if (btnXml) btnXml.disabled = disabled;
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
var tipoSelect = document.querySelector('select[name="tipoCasamento"]');
if (tipoSelect) {
  tipoSelect.addEventListener("change", () => {
    updateOutputs2();
  });
}
window.updateMatricula = updateMatricula;
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
