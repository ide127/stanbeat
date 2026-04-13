(function (T, I) {
  typeof exports == "object" && typeof module < "u"
    ? I(exports)
    : typeof define == "function" && define.amd
      ? define(["exports"], I)
      : ((T = typeof globalThis < "u" ? globalThis : T || self),
        I((T.App = {})));
})(this, function (T) {
  "use strict";
  var Ts = (T) => {
    throw TypeError(T);
  };
  var Ul = (T, I, X) => I.has(T) || Ts("Cannot " + X);
  var vs = (T, I, X) =>
    I.has(T)
      ? Ts("Cannot add the same private member more than once")
      : I instanceof WeakSet
        ? I.add(T)
        : I.set(T, X);
  var As = (T, I, X) => (Ul(T, I, "access private method"), X);
  try {
    let T =
        typeof window < "u"
          ? window
          : typeof global < "u"
            ? global
            : typeof globalThis < "u"
              ? globalThis
              : typeof self < "u"
                ? self
                : {},
      I = new T.Error().stack;
    I &&
      ((T._sentryDebugIds = T._sentryDebugIds || {}),
      (T._sentryDebugIds[I] = "ed103203-86a0-4e7c-bc4f-879db8c7b3f6"),
      (T._sentryDebugIdIdentifier =
        "sentry-dbid-ed103203-86a0-4e7c-bc4f-879db8c7b3f6"));
  } catch {}
  var lt, Rs;
  {
    let e =
      typeof window < "u"
        ? window
        : typeof global < "u"
          ? global
          : typeof globalThis < "u"
            ? globalThis
            : typeof self < "u"
              ? self
              : {};
    e.SENTRY_RELEASE = { id: "8da4a7c207e27b7397a88e6e6bfac9de8abafae4" };
  }
  const I = (e) => document.getElementById(e),
    X = () => document.getElementById("playpause"),
    Cs = () => document.getElementById("applixir-close"),
    Is = () => document.getElementById("content"),
    Ps = () => document.getElementById("adcontainer"),
    Os = () => document.getElementById("videoplayer"),
    xs = () => document.getElementById("videoplayer-container"),
    Ds = () => document.getElementById("applixir-thank-you-modal-container"),
    ks = () => document.getElementById("applixir-thank-you-modal"),
    Ns = () => document.getElementById("applixir-thank-you-modal-body"),
    Ls = () => document.getElementById("applixir-thank-you-modal-close-button"),
    Ms = () => document.getElementById("applixir-confirm-modal-container"),
    Fs = () => document.getElementById("applixir-confirm-modal"),
    Bs = () => document.getElementById("applixir-confirm-modal-body"),
    Us = () => document.getElementById("applixir-confirm-modal-close-button"),
    $s = () => document.getElementById("applixir-confirm-modal-resume-button"),
    cn = () => document.getElementById("didomi-host");
  class js {
    constructor(t) {
      ((this.application = t),
        (this.contentPlayer = Is()),
        (this.adContainer = Ps()),
        (this.videoPlayerDiv_ = Os()),
        (this.videoPlayerContainer_ = xs()),
        (this.width = 1048),
        (this.height = 590));
    }
    preloadContent(t) {
      this.isMobilePlatform()
        ? ((this.preloadListener_ = t),
          this.contentPlayer.addEventListener("loadedmetadata", t, !1),
          this.contentPlayer.load())
        : t();
    }
    removePreloadListener() {
      this.preloadListener_ &&
        (this.contentPlayer.removeEventListener(
          "loadedmetadata",
          this.preloadListener_,
          !1,
        ),
        (this.preloadListener_ = null));
    }
    isMobilePlatform() {
      return (
        this.contentPlayer.paused &&
        (navigator.userAgent.match(/(iPod|iPhone|iPad)/) ||
          navigator.userAgent.toLowerCase().indexOf("android") > -1)
      );
    }
    resize(t, n) {
      t && n && ((this.width = t), (this.height = n));
    }
    registerVideoEndedCallback(t) {
      this.contentPlayer.addEventListener("ended", t, !1);
    }
    removeVideoEndedCallback(t) {
      this.contentPlayer.removeEventListener("ended", t, !1);
    }
  }
  const le = (e, t) =>
      function () {
        t.apply(e, arguments);
      },
    Hs = () => {
      const e = window.location.href;
      return e.substring(0, e.indexOf("/", 8));
    };
  class xe {
    constructor(t, n) {
      ((this.application = t),
        (this.logger = t.logger),
        (this.videoPlayer_ = n),
        (this.adDisplayContainer_ = new google.ima.AdDisplayContainer(
          this.videoPlayer_.adContainer,
          this.videoPlayer_.contentPlayer,
        )),
        (this.adsLoader_ = new google.ima.AdsLoader(this.adDisplayContainer_)),
        (this.adsManager_ = null),
        (this.noAdTimer_ = null),
        this.adsLoader_.addEventListener(
          google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          this.onAdsManagerLoaded_,
          !1,
          this,
        ),
        this.adsLoader_.addEventListener(
          google.ima.AdErrorEvent.Type.AD_ERROR,
          this.onAdError_,
          !1,
          this,
        ));
    }
    initialUserAction() {
      this.adDisplayContainer_.initialize();
    }
    requestAds(t, n, r) {
      var o, i;
      const s = new google.ima.AdsRequest();
      ((s.adTagUrl = t),
        (i =
          (o = google == null ? void 0 : google.ima) == null
            ? void 0
            : o.settings) == null || i.setPpid(r),
        (s.pageUrl = n ?? Hs()),
        (s.linearAdSlotWidth = this.videoPlayer_.width),
        (s.linearAdSlotHeight = this.videoPlayer_.height),
        (s.nonLinearAdSlotWidth = this.videoPlayer_.width),
        (s.nonLinearAdSlotHeight = this.videoPlayer_.height),
        (s.omidAccessModeRules = null),
        this.adsLoader_.requestAds(s));
    }
    pause() {
      this.adsManager_ && this.adsManager_.pause();
    }
    resume() {
      this.adsManager_ && this.adsManager_.resume();
    }
    destroy() {
      this.adsManager_ && this.adsManager_.destroy();
    }
    resize(t, n) {
      this.adsManager_ &&
        t &&
        n &&
        this.adsManager_.resize(t, n, google.ima.ViewMode.NORMAL);
    }
    contentEnded() {
      this.adsLoader_.contentComplete();
    }
    onAdsManagerLoaded_(t) {
      const n = new google.ima.AdsRenderingSettings();
      ((n.restoreCustomPlaybackStateOnAdBreakComplete = !0),
        (n.uiElements = [
          google.ima.UiElements.AD_ATTRIBUTION,
          google.ima.UiElements.COUNTDOWN,
        ]),
        (this.adsManager_ = t.getAdsManager(
          this.videoPlayer_.contentPlayer,
          n,
        )),
        this.startAdsManager_(this.adsManager_));
    }
    startAdsManager_(t) {
      (t.addEventListener(
        google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
        this.onContentPauseRequested_,
        !1,
        this,
      ),
        t.addEventListener(
          google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
          this.onContentResumeRequested_,
          !1,
          this,
        ),
        t.addEventListener(
          google.ima.AdErrorEvent.Type.AD_ERROR,
          this.onAdError_,
          !1,
          this,
        ),
        t.addEventListener(
          google.ima.AdEvent.Type.STARTED,
          this.onAdsStarted_,
          !1,
          this,
        ));
      const n = [
        google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
        google.ima.AdEvent.Type.CLICK,
        google.ima.AdEvent.Type.COMPLETE,
        google.ima.AdEvent.Type.FIRST_QUARTILE,
        google.ima.AdEvent.Type.LOADED,
        google.ima.AdEvent.Type.MIDPOINT,
        google.ima.AdEvent.Type.PAUSED,
        google.ima.AdEvent.Type.STARTED,
        google.ima.AdEvent.Type.THIRD_QUARTILE,
        google.ima.AdEvent.Type.SKIPPED,
      ];
      for (const o in n) t.addEventListener(n[o], this.onAdEvent_, !1, this);
      const r = this.videoPlayer_.width,
        s = this.videoPlayer_.height;
      (t.init(r, s, google.ima.ViewMode.NORMAL), t.start());
    }
    onContentPauseRequested_() {
      (this.application.pauseForAd(),
        this.application.setVideoEndedCallbackEnabled(!1));
    }
    onContentResumeRequested_() {
      this.application.setVideoEndedCallbackEnabled(!0);
    }
    static safeExtractAdEvent(t) {
      try {
        const n = { type: t && t.type ? String(t.type) : null };
        try {
          const r = typeof t.getAd == "function" ? t.getAd() : null;
          r &&
            (n.ad = {
              adId:
                typeof r.getAdId == "function"
                  ? String(r.getAdId())
                  : r.adId || null,
              isLinear:
                typeof r.isLinear == "function"
                  ? !!r.isLinear()
                  : typeof r.isLinear == "boolean"
                    ? r.isLinear
                    : void 0,
              duration:
                typeof r.getDuration == "function"
                  ? Number(r.getDuration())
                  : typeof r.duration == "number"
                    ? r.duration
                    : null,
              title:
                typeof r.getTitle == "function"
                  ? String(r.getTitle())
                  : r.title || null,
              adSystem:
                typeof r.getAdSystem == "function"
                  ? String(r.getAdSystem())
                  : r.adSystem || null,
            });
        } catch {}
        try {
          if (typeof t.getError == "function") {
            const r = t.getError();
            n.error = r ? (r.toString ? r.toString() : String(r)) : null;
          }
        } catch {}
        return n;
      } catch {
        return { type: t && t.type ? String(t.type) : null };
      }
    }
    onAdEvent_(t) {
      this.logger.log("Ad event: " + t.type);
      const n = this.application.adStatusCallbackFn;
      if (
        ((t.type === google.ima.AdEvent.Type.LOADED ||
          t.type === google.ima.AdEvent.Type.STARTED) &&
          (this.noAdTimer_ &&
            (clearTimeout(this.noAdTimer_), (this.noAdTimer_ = null)),
          this.showModalTimer_ &&
            (clearTimeout(this.showModalTimer_),
            (this.showModalTimer_ = null))),
        n)
      )
        try {
          n(xe.safeExtractAdEvent(t));
        } catch {
          try {
            n({ type: String(t.type) });
          } catch {}
        }
      t.type == google.ima.AdEvent.Type.CLICK
        ? this.application.adClicked()
        : t.type == google.ima.AdEvent.Type.LOADED
          ? t.getAd().isLinear() || this.onContentResumeRequested_()
          : t.type == google.ima.AdEvent.Type.ALL_ADS_COMPLETED
            ? this.application.allAdsCompleted()
            : t.type == google.ima.AdEvent.Type.COMPLETE &&
              this.application.adWatched();
    }
    onAdError_(t) {
      this.logger.log("Ad error: " + t.getError().toString());
      const n = this.application.adErrorCallbackFn;
      if (
        (n && n(t),
        this.noAdTimer_ &&
          (clearTimeout(this.noAdTimer_), (this.noAdTimer_ = null)),
        this.adsManager_)
      ) {
        try {
          this.adsManager_.destroy();
        } catch (r) {
          this.logger.log("destroy adsManager failed: " + r.toString());
        }
        this.adsManager_ = null;
      }
      (this.showModalTimer_ &&
        (clearTimeout(this.showModalTimer_), (this.showModalTimer_ = null)),
        (this.showModalTimer_ = setTimeout(() => {
          try {
            if (this.application && this.application.manuallyClosed_) {
              (this.logger.log(
                "Player manually closed before modal — skipping.",
              ),
                (this.showModalTimer_ = null));
              return;
            }
            if (this.application && this.application.modal_) {
              const r = this.application.modal_,
                s = "Sorry,";
              if (r.modalTitleParagraph) r.modalTitleParagraph.textContent = s;
              else {
                const o =
                  document.getElementById("applixir-thank-you-modal-title") ||
                  document.getElementById("applixir-confirm-modal-title");
                o && (o.textContent = s);
              }
              if (r.modalBodyParagraph)
                r.modalBodyParagraph.textContent = "No Video Ad at this time!";
              else {
                const o =
                  document.getElementById("applixir-thank-you-modal-body") ||
                  document.getElementById("applixir-confirm-modal-body");
                o && (o.textContent = "No Video Ad at this time!");
              }
              try {
                ((this.application.playing_ = !1),
                  (this.application.adsActive_ = !1),
                  (this.application.adsDone_ = !1),
                  this.videoPlayer_.videoPlayerContainer_.classList.add(
                    "applixir-hide-element",
                  ),
                  this.application.updatePlayButton());
              } catch (o) {
                this.logger.log(
                  "Error updating player state on no-ad modal: " + o.toString(),
                );
              }
              r.show();
            }
          } catch (r) {
            this.logger.log("Error showing no-ad modal: " + r.toString());
          } finally {
            this.showModalTimer_ = null;
          }
        }, 3e3)));
    }
    onAdsStarted_() {}
  }
  class qs {
    constructor() {}
    log(t) {
      console.log(t);
    }
  }
  function un(e, t) {
    return function () {
      return e.apply(t, arguments);
    };
  }
  const { toString: zs } = Object.prototype,
    { getPrototypeOf: ft } = Object,
    De = ((e) => (t) => {
      const n = zs.call(t);
      return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
    })(Object.create(null)),
    F = (e) => ((e = e.toLowerCase()), (t) => De(t) === e),
    ke = (e) => (t) => typeof t === e,
    { isArray: de } = Array,
    Ee = ke("undefined");
  function Vs(e) {
    return (
      e !== null &&
      !Ee(e) &&
      e.constructor !== null &&
      !Ee(e.constructor) &&
      N(e.constructor.isBuffer) &&
      e.constructor.isBuffer(e)
    );
  }
  const ln = F("ArrayBuffer");
  function Gs(e) {
    let t;
    return (
      typeof ArrayBuffer < "u" && ArrayBuffer.isView
        ? (t = ArrayBuffer.isView(e))
        : (t = e && e.buffer && ln(e.buffer)),
      t
    );
  }
  const Ws = ke("string"),
    N = ke("function"),
    dn = ke("number"),
    Ne = (e) => e !== null && typeof e == "object",
    Ks = (e) => e === !0 || e === !1,
    Le = (e) => {
      if (De(e) !== "object") return !1;
      const t = ft(e);
      return (
        (t === null ||
          t === Object.prototype ||
          Object.getPrototypeOf(t) === null) &&
        !(Symbol.toStringTag in e) &&
        !(Symbol.iterator in e)
      );
    },
    Js = F("Date"),
    Ys = F("File"),
    Xs = F("Blob"),
    Qs = F("FileList"),
    Zs = (e) => Ne(e) && N(e.pipe),
    eo = (e) => {
      let t;
      return (
        e &&
        ((typeof FormData == "function" && e instanceof FormData) ||
          (N(e.append) &&
            ((t = De(e)) === "formdata" ||
              (t === "object" &&
                N(e.toString) &&
                e.toString() === "[object FormData]"))))
      );
    },
    to = F("URLSearchParams"),
    [no, ro, so, oo] = ["ReadableStream", "Request", "Response", "Headers"].map(
      F,
    ),
    io = (e) =>
      e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  function Se(e, t, { allOwnKeys: n = !1 } = {}) {
    if (e === null || typeof e > "u") return;
    let r, s;
    if ((typeof e != "object" && (e = [e]), de(e)))
      for (r = 0, s = e.length; r < s; r++) t.call(null, e[r], r, e);
    else {
      const o = n ? Object.getOwnPropertyNames(e) : Object.keys(e),
        i = o.length;
      let a;
      for (r = 0; r < i; r++) ((a = o[r]), t.call(null, e[a], a, e));
    }
  }
  function fn(e, t) {
    t = t.toLowerCase();
    const n = Object.keys(e);
    let r = n.length,
      s;
    for (; r-- > 0; ) if (((s = n[r]), t === s.toLowerCase())) return s;
    return null;
  }
  const Q =
      typeof globalThis < "u"
        ? globalThis
        : typeof self < "u"
          ? self
          : typeof window < "u"
            ? window
            : global,
    pn = (e) => !Ee(e) && e !== Q;
  function pt() {
    const { caseless: e } = (pn(this) && this) || {},
      t = {},
      n = (r, s) => {
        const o = (e && fn(t, s)) || s;
        Le(t[o]) && Le(r)
          ? (t[o] = pt(t[o], r))
          : Le(r)
            ? (t[o] = pt({}, r))
            : de(r)
              ? (t[o] = r.slice())
              : (t[o] = r);
      };
    for (let r = 0, s = arguments.length; r < s; r++)
      arguments[r] && Se(arguments[r], n);
    return t;
  }
  const ao = (e, t, n, { allOwnKeys: r } = {}) => (
      Se(
        t,
        (s, o) => {
          n && N(s) ? (e[o] = un(s, n)) : (e[o] = s);
        },
        { allOwnKeys: r },
      ),
      e
    ),
    co = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e),
    uo = (e, t, n, r) => {
      ((e.prototype = Object.create(t.prototype, r)),
        (e.prototype.constructor = e),
        Object.defineProperty(e, "super", { value: t.prototype }),
        n && Object.assign(e.prototype, n));
    },
    lo = (e, t, n, r) => {
      let s, o, i;
      const a = {};
      if (((t = t || {}), e == null)) return t;
      do {
        for (s = Object.getOwnPropertyNames(e), o = s.length; o-- > 0; )
          ((i = s[o]),
            (!r || r(i, e, t)) && !a[i] && ((t[i] = e[i]), (a[i] = !0)));
        e = n !== !1 && ft(e);
      } while (e && (!n || n(e, t)) && e !== Object.prototype);
      return t;
    },
    fo = (e, t, n) => {
      ((e = String(e)),
        (n === void 0 || n > e.length) && (n = e.length),
        (n -= t.length));
      const r = e.indexOf(t, n);
      return r !== -1 && r === n;
    },
    po = (e) => {
      if (!e) return null;
      if (de(e)) return e;
      let t = e.length;
      if (!dn(t)) return null;
      const n = new Array(t);
      for (; t-- > 0; ) n[t] = e[t];
      return n;
    },
    ho = (
      (e) => (t) =>
        e && t instanceof e
    )(typeof Uint8Array < "u" && ft(Uint8Array)),
    mo = (e, t) => {
      const r = (e && e[Symbol.iterator]).call(e);
      let s;
      for (; (s = r.next()) && !s.done; ) {
        const o = s.value;
        t.call(e, o[0], o[1]);
      }
    },
    go = (e, t) => {
      let n;
      const r = [];
      for (; (n = e.exec(t)) !== null; ) r.push(n);
      return r;
    },
    yo = F("HTMLFormElement"),
    _o = (e) =>
      e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function (n, r, s) {
        return r.toUpperCase() + s;
      }),
    hn = (
      ({ hasOwnProperty: e }) =>
      (t, n) =>
        e.call(t, n)
    )(Object.prototype),
    Eo = F("RegExp"),
    mn = (e, t) => {
      const n = Object.getOwnPropertyDescriptors(e),
        r = {};
      (Se(n, (s, o) => {
        let i;
        (i = t(s, o, e)) !== !1 && (r[o] = i || s);
      }),
        Object.defineProperties(e, r));
    },
    So = (e) => {
      mn(e, (t, n) => {
        if (N(e) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
          return !1;
        const r = e[n];
        if (N(r)) {
          if (((t.enumerable = !1), "writable" in t)) {
            t.writable = !1;
            return;
          }
          t.set ||
            (t.set = () => {
              throw Error("Can not rewrite read-only method '" + n + "'");
            });
        }
      });
    },
    bo = (e, t) => {
      const n = {},
        r = (s) => {
          s.forEach((o) => {
            n[o] = !0;
          });
        };
      return (de(e) ? r(e) : r(String(e).split(t)), n);
    },
    wo = () => {},
    To = (e, t) => (e != null && Number.isFinite((e = +e)) ? e : t),
    ht = "abcdefghijklmnopqrstuvwxyz",
    gn = "0123456789",
    yn = { DIGIT: gn, ALPHA: ht, ALPHA_DIGIT: ht + ht.toUpperCase() + gn },
    vo = (e = 16, t = yn.ALPHA_DIGIT) => {
      let n = "";
      const { length: r } = t;
      for (; e--; ) n += t[(Math.random() * r) | 0];
      return n;
    };
  function Ao(e) {
    return !!(
      e &&
      N(e.append) &&
      e[Symbol.toStringTag] === "FormData" &&
      e[Symbol.iterator]
    );
  }
  const Ro = (e) => {
      const t = new Array(10),
        n = (r, s) => {
          if (Ne(r)) {
            if (t.indexOf(r) >= 0) return;
            if (!("toJSON" in r)) {
              t[s] = r;
              const o = de(r) ? [] : {};
              return (
                Se(r, (i, a) => {
                  const c = n(i, s + 1);
                  !Ee(c) && (o[a] = c);
                }),
                (t[s] = void 0),
                o
              );
            }
          }
          return r;
        };
      return n(e, 0);
    },
    Co = F("AsyncFunction"),
    Io = (e) => e && (Ne(e) || N(e)) && N(e.then) && N(e.catch),
    _n = ((e, t) =>
      e
        ? setImmediate
        : t
          ? ((n, r) => (
              Q.addEventListener(
                "message",
                ({ source: s, data: o }) => {
                  s === Q && o === n && r.length && r.shift()();
                },
                !1,
              ),
              (s) => {
                (r.push(s), Q.postMessage(n, "*"));
              }
            ))(`axios@${Math.random()}`, [])
          : (n) => setTimeout(n))(
      typeof setImmediate == "function",
      N(Q.postMessage),
    ),
    Po =
      typeof queueMicrotask < "u"
        ? queueMicrotask.bind(Q)
        : (typeof process < "u" && process.nextTick) || _n,
    d = {
      isArray: de,
      isArrayBuffer: ln,
      isBuffer: Vs,
      isFormData: eo,
      isArrayBufferView: Gs,
      isString: Ws,
      isNumber: dn,
      isBoolean: Ks,
      isObject: Ne,
      isPlainObject: Le,
      isReadableStream: no,
      isRequest: ro,
      isResponse: so,
      isHeaders: oo,
      isUndefined: Ee,
      isDate: Js,
      isFile: Ys,
      isBlob: Xs,
      isRegExp: Eo,
      isFunction: N,
      isStream: Zs,
      isURLSearchParams: to,
      isTypedArray: ho,
      isFileList: Qs,
      forEach: Se,
      merge: pt,
      extend: ao,
      trim: io,
      stripBOM: co,
      inherits: uo,
      toFlatObject: lo,
      kindOf: De,
      kindOfTest: F,
      endsWith: fo,
      toArray: po,
      forEachEntry: mo,
      matchAll: go,
      isHTMLForm: yo,
      hasOwnProperty: hn,
      hasOwnProp: hn,
      reduceDescriptors: mn,
      freezeMethods: So,
      toObjectSet: bo,
      toCamelCase: _o,
      noop: wo,
      toFiniteNumber: To,
      findKey: fn,
      global: Q,
      isContextDefined: pn,
      ALPHABET: yn,
      generateString: vo,
      isSpecCompliantForm: Ao,
      toJSONObject: Ro,
      isAsyncFn: Co,
      isThenable: Io,
      setImmediate: _n,
      asap: Po,
    };
  function E(e, t, n, r, s) {
    (Error.call(this),
      Error.captureStackTrace
        ? Error.captureStackTrace(this, this.constructor)
        : (this.stack = new Error().stack),
      (this.message = e),
      (this.name = "AxiosError"),
      t && (this.code = t),
      n && (this.config = n),
      r && (this.request = r),
      s && ((this.response = s), (this.status = s.status ? s.status : null)));
  }
  d.inherits(E, Error, {
    toJSON: function () {
      return {
        message: this.message,
        name: this.name,
        description: this.description,
        number: this.number,
        fileName: this.fileName,
        lineNumber: this.lineNumber,
        columnNumber: this.columnNumber,
        stack: this.stack,
        config: d.toJSONObject(this.config),
        code: this.code,
        status: this.status,
      };
    },
  });
  const En = E.prototype,
    Sn = {};
  ([
    "ERR_BAD_OPTION_VALUE",
    "ERR_BAD_OPTION",
    "ECONNABORTED",
    "ETIMEDOUT",
    "ERR_NETWORK",
    "ERR_FR_TOO_MANY_REDIRECTS",
    "ERR_DEPRECATED",
    "ERR_BAD_RESPONSE",
    "ERR_BAD_REQUEST",
    "ERR_CANCELED",
    "ERR_NOT_SUPPORT",
    "ERR_INVALID_URL",
  ].forEach((e) => {
    Sn[e] = { value: e };
  }),
    Object.defineProperties(E, Sn),
    Object.defineProperty(En, "isAxiosError", { value: !0 }),
    (E.from = (e, t, n, r, s, o) => {
      const i = Object.create(En);
      return (
        d.toFlatObject(
          e,
          i,
          function (c) {
            return c !== Error.prototype;
          },
          (a) => a !== "isAxiosError",
        ),
        E.call(i, e.message, t, n, r, s),
        (i.cause = e),
        (i.name = e.name),
        o && Object.assign(i, o),
        i
      );
    }));
  const Oo = null;
  function mt(e) {
    return d.isPlainObject(e) || d.isArray(e);
  }
  function bn(e) {
    return d.endsWith(e, "[]") ? e.slice(0, -2) : e;
  }
  function wn(e, t, n) {
    return e
      ? e
          .concat(t)
          .map(function (s, o) {
            return ((s = bn(s)), !n && o ? "[" + s + "]" : s);
          })
          .join(n ? "." : "")
      : t;
  }
  function xo(e) {
    return d.isArray(e) && !e.some(mt);
  }
  const Do = d.toFlatObject(d, {}, null, function (t) {
    return /^is[A-Z]/.test(t);
  });
  function Me(e, t, n) {
    if (!d.isObject(e)) throw new TypeError("target must be an object");
    ((t = t || new FormData()),
      (n = d.toFlatObject(
        n,
        { metaTokens: !0, dots: !1, indexes: !1 },
        !1,
        function (y, g) {
          return !d.isUndefined(g[y]);
        },
      )));
    const r = n.metaTokens,
      s = n.visitor || l,
      o = n.dots,
      i = n.indexes,
      c = (n.Blob || (typeof Blob < "u" && Blob)) && d.isSpecCompliantForm(t);
    if (!d.isFunction(s)) throw new TypeError("visitor must be a function");
    function u(h) {
      if (h === null) return "";
      if (d.isDate(h)) return h.toISOString();
      if (!c && d.isBlob(h))
        throw new E("Blob is not supported. Use a Buffer instead.");
      return d.isArrayBuffer(h) || d.isTypedArray(h)
        ? c && typeof Blob == "function"
          ? new Blob([h])
          : Buffer.from(h)
        : h;
    }
    function l(h, y, g) {
      let w = h;
      if (h && !g && typeof h == "object") {
        if (d.endsWith(y, "{}"))
          ((y = r ? y : y.slice(0, -2)), (h = JSON.stringify(h)));
        else if (
          (d.isArray(h) && xo(h)) ||
          ((d.isFileList(h) || d.endsWith(y, "[]")) && (w = d.toArray(h)))
        )
          return (
            (y = bn(y)),
            w.forEach(function (R, V) {
              !(d.isUndefined(R) || R === null) &&
                t.append(
                  i === !0 ? wn([y], V, o) : i === null ? y : y + "[]",
                  u(R),
                );
            }),
            !1
          );
      }
      return mt(h) ? !0 : (t.append(wn(g, y, o), u(h)), !1);
    }
    const f = [],
      m = Object.assign(Do, {
        defaultVisitor: l,
        convertValue: u,
        isVisitable: mt,
      });
    function p(h, y) {
      if (!d.isUndefined(h)) {
        if (f.indexOf(h) !== -1)
          throw Error("Circular reference detected in " + y.join("."));
        (f.push(h),
          d.forEach(h, function (w, v) {
            (!(d.isUndefined(w) || w === null) &&
              s.call(t, w, d.isString(v) ? v.trim() : v, y, m)) === !0 &&
              p(w, y ? y.concat(v) : [v]);
          }),
          f.pop());
      }
    }
    if (!d.isObject(e)) throw new TypeError("data must be an object");
    return (p(e), t);
  }
  function Tn(e) {
    const t = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\0",
    };
    return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g, function (r) {
      return t[r];
    });
  }
  function gt(e, t) {
    ((this._pairs = []), e && Me(e, this, t));
  }
  const vn = gt.prototype;
  ((vn.append = function (t, n) {
    this._pairs.push([t, n]);
  }),
    (vn.toString = function (t) {
      const n = t
        ? function (r) {
            return t.call(this, r, Tn);
          }
        : Tn;
      return this._pairs
        .map(function (s) {
          return n(s[0]) + "=" + n(s[1]);
        }, "")
        .join("&");
    }));
  function ko(e) {
    return encodeURIComponent(e)
      .replace(/%3A/gi, ":")
      .replace(/%24/g, "$")
      .replace(/%2C/gi, ",")
      .replace(/%20/g, "+")
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]");
  }
  function An(e, t, n) {
    if (!t) return e;
    const r = (n && n.encode) || ko;
    d.isFunction(n) && (n = { serialize: n });
    const s = n && n.serialize;
    let o;
    if (
      (s
        ? (o = s(t, n))
        : (o = d.isURLSearchParams(t)
            ? t.toString()
            : new gt(t, n).toString(r)),
      o)
    ) {
      const i = e.indexOf("#");
      (i !== -1 && (e = e.slice(0, i)),
        (e += (e.indexOf("?") === -1 ? "?" : "&") + o));
    }
    return e;
  }
  class Rn {
    constructor() {
      this.handlers = [];
    }
    use(t, n, r) {
      return (
        this.handlers.push({
          fulfilled: t,
          rejected: n,
          synchronous: r ? r.synchronous : !1,
          runWhen: r ? r.runWhen : null,
        }),
        this.handlers.length - 1
      );
    }
    eject(t) {
      this.handlers[t] && (this.handlers[t] = null);
    }
    clear() {
      this.handlers && (this.handlers = []);
    }
    forEach(t) {
      d.forEach(this.handlers, function (r) {
        r !== null && t(r);
      });
    }
  }
  const Cn = {
      silentJSONParsing: !0,
      forcedJSONParsing: !0,
      clarifyTimeoutError: !1,
    },
    No = {
      isBrowser: !0,
      classes: {
        URLSearchParams: typeof URLSearchParams < "u" ? URLSearchParams : gt,
        FormData: typeof FormData < "u" ? FormData : null,
        Blob: typeof Blob < "u" ? Blob : null,
      },
      protocols: ["http", "https", "file", "blob", "url", "data"],
    },
    yt = typeof window < "u" && typeof document < "u",
    _t = (typeof navigator == "object" && navigator) || void 0,
    Lo =
      yt &&
      (!_t || ["ReactNative", "NativeScript", "NS"].indexOf(_t.product) < 0),
    Mo =
      typeof WorkerGlobalScope < "u" &&
      self instanceof WorkerGlobalScope &&
      typeof self.importScripts == "function",
    Fo = (yt && window.location.href) || "http://localhost",
    P = {
      ...Object.freeze(
        Object.defineProperty(
          {
            __proto__: null,
            hasBrowserEnv: yt,
            hasStandardBrowserEnv: Lo,
            hasStandardBrowserWebWorkerEnv: Mo,
            navigator: _t,
            origin: Fo,
          },
          Symbol.toStringTag,
          { value: "Module" },
        ),
      ),
      ...No,
    };
  function Bo(e, t) {
    return Me(
      e,
      new P.classes.URLSearchParams(),
      Object.assign(
        {
          visitor: function (n, r, s, o) {
            return P.isNode && d.isBuffer(n)
              ? (this.append(r, n.toString("base64")), !1)
              : o.defaultVisitor.apply(this, arguments);
          },
        },
        t,
      ),
    );
  }
  function Uo(e) {
    return d
      .matchAll(/\w+|\[(\w*)]/g, e)
      .map((t) => (t[0] === "[]" ? "" : t[1] || t[0]));
  }
  function $o(e) {
    const t = {},
      n = Object.keys(e);
    let r;
    const s = n.length;
    let o;
    for (r = 0; r < s; r++) ((o = n[r]), (t[o] = e[o]));
    return t;
  }
  function In(e) {
    function t(n, r, s, o) {
      let i = n[o++];
      if (i === "__proto__") return !0;
      const a = Number.isFinite(+i),
        c = o >= n.length;
      return (
        (i = !i && d.isArray(s) ? s.length : i),
        c
          ? (d.hasOwnProp(s, i) ? (s[i] = [s[i], r]) : (s[i] = r), !a)
          : ((!s[i] || !d.isObject(s[i])) && (s[i] = []),
            t(n, r, s[i], o) && d.isArray(s[i]) && (s[i] = $o(s[i])),
            !a)
      );
    }
    if (d.isFormData(e) && d.isFunction(e.entries)) {
      const n = {};
      return (
        d.forEachEntry(e, (r, s) => {
          t(Uo(r), s, n, 0);
        }),
        n
      );
    }
    return null;
  }
  function jo(e, t, n) {
    if (d.isString(e))
      try {
        return ((t || JSON.parse)(e), d.trim(e));
      } catch (r) {
        if (r.name !== "SyntaxError") throw r;
      }
    return (0, JSON.stringify)(e);
  }
  const be = {
    transitional: Cn,
    adapter: ["xhr", "http", "fetch"],
    transformRequest: [
      function (t, n) {
        const r = n.getContentType() || "",
          s = r.indexOf("application/json") > -1,
          o = d.isObject(t);
        if ((o && d.isHTMLForm(t) && (t = new FormData(t)), d.isFormData(t)))
          return s ? JSON.stringify(In(t)) : t;
        if (
          d.isArrayBuffer(t) ||
          d.isBuffer(t) ||
          d.isStream(t) ||
          d.isFile(t) ||
          d.isBlob(t) ||
          d.isReadableStream(t)
        )
          return t;
        if (d.isArrayBufferView(t)) return t.buffer;
        if (d.isURLSearchParams(t))
          return (
            n.setContentType(
              "application/x-www-form-urlencoded;charset=utf-8",
              !1,
            ),
            t.toString()
          );
        let a;
        if (o) {
          if (r.indexOf("application/x-www-form-urlencoded") > -1)
            return Bo(t, this.formSerializer).toString();
          if ((a = d.isFileList(t)) || r.indexOf("multipart/form-data") > -1) {
            const c = this.env && this.env.FormData;
            return Me(
              a ? { "files[]": t } : t,
              c && new c(),
              this.formSerializer,
            );
          }
        }
        return o || s ? (n.setContentType("application/json", !1), jo(t)) : t;
      },
    ],
    transformResponse: [
      function (t) {
        const n = this.transitional || be.transitional,
          r = n && n.forcedJSONParsing,
          s = this.responseType === "json";
        if (d.isResponse(t) || d.isReadableStream(t)) return t;
        if (t && d.isString(t) && ((r && !this.responseType) || s)) {
          const i = !(n && n.silentJSONParsing) && s;
          try {
            return JSON.parse(t);
          } catch (a) {
            if (i)
              throw a.name === "SyntaxError"
                ? E.from(a, E.ERR_BAD_RESPONSE, this, null, this.response)
                : a;
          }
        }
        return t;
      },
    ],
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: P.classes.FormData, Blob: P.classes.Blob },
    validateStatus: function (t) {
      return t >= 200 && t < 300;
    },
    headers: {
      common: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": void 0,
      },
    },
  };
  d.forEach(["delete", "get", "head", "post", "put", "patch"], (e) => {
    be.headers[e] = {};
  });
  const Ho = d.toObjectSet([
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent",
    ]),
    qo = (e) => {
      const t = {};
      let n, r, s;
      return (
        e &&
          e
            .split(
              `
`,
            )
            .forEach(function (i) {
              ((s = i.indexOf(":")),
                (n = i.substring(0, s).trim().toLowerCase()),
                (r = i.substring(s + 1).trim()),
                !(!n || (t[n] && Ho[n])) &&
                  (n === "set-cookie"
                    ? t[n]
                      ? t[n].push(r)
                      : (t[n] = [r])
                    : (t[n] = t[n] ? t[n] + ", " + r : r)));
            }),
        t
      );
    },
    Pn = Symbol("internals");
  function we(e) {
    return e && String(e).trim().toLowerCase();
  }
  function Fe(e) {
    return e === !1 || e == null ? e : d.isArray(e) ? e.map(Fe) : String(e);
  }
  function zo(e) {
    const t = Object.create(null),
      n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
    let r;
    for (; (r = n.exec(e)); ) t[r[1]] = r[2];
    return t;
  }
  const Vo = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
  function Et(e, t, n, r, s) {
    if (d.isFunction(r)) return r.call(this, t, n);
    if ((s && (t = n), !!d.isString(t))) {
      if (d.isString(r)) return t.indexOf(r) !== -1;
      if (d.isRegExp(r)) return r.test(t);
    }
  }
  function Go(e) {
    return e
      .trim()
      .toLowerCase()
      .replace(/([a-z\d])(\w*)/g, (t, n, r) => n.toUpperCase() + r);
  }
  function Wo(e, t) {
    const n = d.toCamelCase(" " + t);
    ["get", "set", "has"].forEach((r) => {
      Object.defineProperty(e, r + n, {
        value: function (s, o, i) {
          return this[r].call(this, t, s, o, i);
        },
        configurable: !0,
      });
    });
  }
  class x {
    constructor(t) {
      t && this.set(t);
    }
    set(t, n, r) {
      const s = this;
      function o(a, c, u) {
        const l = we(c);
        if (!l) throw new Error("header name must be a non-empty string");
        const f = d.findKey(s, l);
        (!f || s[f] === void 0 || u === !0 || (u === void 0 && s[f] !== !1)) &&
          (s[f || c] = Fe(a));
      }
      const i = (a, c) => d.forEach(a, (u, l) => o(u, l, c));
      if (d.isPlainObject(t) || t instanceof this.constructor) i(t, n);
      else if (d.isString(t) && (t = t.trim()) && !Vo(t)) i(qo(t), n);
      else if (d.isHeaders(t)) for (const [a, c] of t.entries()) o(c, a, r);
      else t != null && o(n, t, r);
      return this;
    }
    get(t, n) {
      if (((t = we(t)), t)) {
        const r = d.findKey(this, t);
        if (r) {
          const s = this[r];
          if (!n) return s;
          if (n === !0) return zo(s);
          if (d.isFunction(n)) return n.call(this, s, r);
          if (d.isRegExp(n)) return n.exec(s);
          throw new TypeError("parser must be boolean|regexp|function");
        }
      }
    }
    has(t, n) {
      if (((t = we(t)), t)) {
        const r = d.findKey(this, t);
        return !!(r && this[r] !== void 0 && (!n || Et(this, this[r], r, n)));
      }
      return !1;
    }
    delete(t, n) {
      const r = this;
      let s = !1;
      function o(i) {
        if (((i = we(i)), i)) {
          const a = d.findKey(r, i);
          a && (!n || Et(r, r[a], a, n)) && (delete r[a], (s = !0));
        }
      }
      return (d.isArray(t) ? t.forEach(o) : o(t), s);
    }
    clear(t) {
      const n = Object.keys(this);
      let r = n.length,
        s = !1;
      for (; r--; ) {
        const o = n[r];
        (!t || Et(this, this[o], o, t, !0)) && (delete this[o], (s = !0));
      }
      return s;
    }
    normalize(t) {
      const n = this,
        r = {};
      return (
        d.forEach(this, (s, o) => {
          const i = d.findKey(r, o);
          if (i) {
            ((n[i] = Fe(s)), delete n[o]);
            return;
          }
          const a = t ? Go(o) : String(o).trim();
          (a !== o && delete n[o], (n[a] = Fe(s)), (r[a] = !0));
        }),
        this
      );
    }
    concat(...t) {
      return this.constructor.concat(this, ...t);
    }
    toJSON(t) {
      const n = Object.create(null);
      return (
        d.forEach(this, (r, s) => {
          r != null &&
            r !== !1 &&
            (n[s] = t && d.isArray(r) ? r.join(", ") : r);
        }),
        n
      );
    }
    [Symbol.iterator]() {
      return Object.entries(this.toJSON())[Symbol.iterator]();
    }
    toString() {
      return Object.entries(this.toJSON()).map(([t, n]) => t + ": " + n).join(`
`);
    }
    get [Symbol.toStringTag]() {
      return "AxiosHeaders";
    }
    static from(t) {
      return t instanceof this ? t : new this(t);
    }
    static concat(t, ...n) {
      const r = new this(t);
      return (n.forEach((s) => r.set(s)), r);
    }
    static accessor(t) {
      const r = (this[Pn] = this[Pn] = { accessors: {} }).accessors,
        s = this.prototype;
      function o(i) {
        const a = we(i);
        r[a] || (Wo(s, i), (r[a] = !0));
      }
      return (d.isArray(t) ? t.forEach(o) : o(t), this);
    }
  }
  (x.accessor([
    "Content-Type",
    "Content-Length",
    "Accept",
    "Accept-Encoding",
    "User-Agent",
    "Authorization",
  ]),
    d.reduceDescriptors(x.prototype, ({ value: e }, t) => {
      let n = t[0].toUpperCase() + t.slice(1);
      return {
        get: () => e,
        set(r) {
          this[n] = r;
        },
      };
    }),
    d.freezeMethods(x));
  function St(e, t) {
    const n = this || be,
      r = t || n,
      s = x.from(r.headers);
    let o = r.data;
    return (
      d.forEach(e, function (a) {
        o = a.call(n, o, s.normalize(), t ? t.status : void 0);
      }),
      s.normalize(),
      o
    );
  }
  function On(e) {
    return !!(e && e.__CANCEL__);
  }
  function fe(e, t, n) {
    (E.call(this, e ?? "canceled", E.ERR_CANCELED, t, n),
      (this.name = "CanceledError"));
  }
  d.inherits(fe, E, { __CANCEL__: !0 });
  function xn(e, t, n) {
    const r = n.config.validateStatus;
    !n.status || !r || r(n.status)
      ? e(n)
      : t(
          new E(
            "Request failed with status code " + n.status,
            [E.ERR_BAD_REQUEST, E.ERR_BAD_RESPONSE][
              Math.floor(n.status / 100) - 4
            ],
            n.config,
            n.request,
            n,
          ),
        );
  }
  function Ko(e) {
    const t = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
    return (t && t[1]) || "";
  }
  function Jo(e, t) {
    e = e || 10;
    const n = new Array(e),
      r = new Array(e);
    let s = 0,
      o = 0,
      i;
    return (
      (t = t !== void 0 ? t : 1e3),
      function (c) {
        const u = Date.now(),
          l = r[o];
        (i || (i = u), (n[s] = c), (r[s] = u));
        let f = o,
          m = 0;
        for (; f !== s; ) ((m += n[f++]), (f = f % e));
        if (((s = (s + 1) % e), s === o && (o = (o + 1) % e), u - i < t))
          return;
        const p = l && u - l;
        return p ? Math.round((m * 1e3) / p) : void 0;
      }
    );
  }
  function Yo(e, t) {
    let n = 0,
      r = 1e3 / t,
      s,
      o;
    const i = (u, l = Date.now()) => {
      ((n = l),
        (s = null),
        o && (clearTimeout(o), (o = null)),
        e.apply(null, u));
    };
    return [
      (...u) => {
        const l = Date.now(),
          f = l - n;
        f >= r
          ? i(u, l)
          : ((s = u),
            o ||
              (o = setTimeout(() => {
                ((o = null), i(s));
              }, r - f)));
      },
      () => s && i(s),
    ];
  }
  const Be = (e, t, n = 3) => {
      let r = 0;
      const s = Jo(50, 250);
      return Yo((o) => {
        const i = o.loaded,
          a = o.lengthComputable ? o.total : void 0,
          c = i - r,
          u = s(c),
          l = i <= a;
        r = i;
        const f = {
          loaded: i,
          total: a,
          progress: a ? i / a : void 0,
          bytes: c,
          rate: u || void 0,
          estimated: u && a && l ? (a - i) / u : void 0,
          event: o,
          lengthComputable: a != null,
          [t ? "download" : "upload"]: !0,
        };
        e(f);
      }, n);
    },
    Dn = (e, t) => {
      const n = e != null;
      return [(r) => t[0]({ lengthComputable: n, total: e, loaded: r }), t[1]];
    },
    kn =
      (e) =>
      (...t) =>
        d.asap(() => e(...t)),
    Xo = P.hasStandardBrowserEnv
      ? ((e, t) => (n) => (
          (n = new URL(n, P.origin)),
          e.protocol === n.protocol &&
            e.host === n.host &&
            (t || e.port === n.port)
        ))(
          new URL(P.origin),
          P.navigator && /(msie|trident)/i.test(P.navigator.userAgent),
        )
      : () => !0,
    Qo = P.hasStandardBrowserEnv
      ? {
          write(e, t, n, r, s, o) {
            const i = [e + "=" + encodeURIComponent(t)];
            (d.isNumber(n) && i.push("expires=" + new Date(n).toGMTString()),
              d.isString(r) && i.push("path=" + r),
              d.isString(s) && i.push("domain=" + s),
              o === !0 && i.push("secure"),
              (document.cookie = i.join("; ")));
          },
          read(e) {
            const t = document.cookie.match(
              new RegExp("(^|;\\s*)(" + e + ")=([^;]*)"),
            );
            return t ? decodeURIComponent(t[3]) : null;
          },
          remove(e) {
            this.write(e, "", Date.now() - 864e5);
          },
        }
      : {
          write() {},
          read() {
            return null;
          },
          remove() {},
        };
  function Zo(e) {
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
  }
  function ei(e, t) {
    return t ? e.replace(/\/?\/$/, "") + "/" + t.replace(/^\/+/, "") : e;
  }
  function Nn(e, t) {
    return e && !Zo(t) ? ei(e, t) : t;
  }
  const Ln = (e) => (e instanceof x ? { ...e } : e);
  function Z(e, t) {
    t = t || {};
    const n = {};
    function r(u, l, f, m) {
      return d.isPlainObject(u) && d.isPlainObject(l)
        ? d.merge.call({ caseless: m }, u, l)
        : d.isPlainObject(l)
          ? d.merge({}, l)
          : d.isArray(l)
            ? l.slice()
            : l;
    }
    function s(u, l, f, m) {
      if (d.isUndefined(l)) {
        if (!d.isUndefined(u)) return r(void 0, u, f, m);
      } else return r(u, l, f, m);
    }
    function o(u, l) {
      if (!d.isUndefined(l)) return r(void 0, l);
    }
    function i(u, l) {
      if (d.isUndefined(l)) {
        if (!d.isUndefined(u)) return r(void 0, u);
      } else return r(void 0, l);
    }
    function a(u, l, f) {
      if (f in t) return r(u, l);
      if (f in e) return r(void 0, u);
    }
    const c = {
      url: o,
      method: o,
      data: o,
      baseURL: i,
      transformRequest: i,
      transformResponse: i,
      paramsSerializer: i,
      timeout: i,
      timeoutMessage: i,
      withCredentials: i,
      withXSRFToken: i,
      adapter: i,
      responseType: i,
      xsrfCookieName: i,
      xsrfHeaderName: i,
      onUploadProgress: i,
      onDownloadProgress: i,
      decompress: i,
      maxContentLength: i,
      maxBodyLength: i,
      beforeRedirect: i,
      transport: i,
      httpAgent: i,
      httpsAgent: i,
      cancelToken: i,
      socketPath: i,
      responseEncoding: i,
      validateStatus: a,
      headers: (u, l, f) => s(Ln(u), Ln(l), f, !0),
    };
    return (
      d.forEach(Object.keys(Object.assign({}, e, t)), function (l) {
        const f = c[l] || s,
          m = f(e[l], t[l], l);
        (d.isUndefined(m) && f !== a) || (n[l] = m);
      }),
      n
    );
  }
  const Mn = (e) => {
      const t = Z({}, e);
      let {
        data: n,
        withXSRFToken: r,
        xsrfHeaderName: s,
        xsrfCookieName: o,
        headers: i,
        auth: a,
      } = t;
      ((t.headers = i = x.from(i)),
        (t.url = An(Nn(t.baseURL, t.url), e.params, e.paramsSerializer)),
        a &&
          i.set(
            "Authorization",
            "Basic " +
              btoa(
                (a.username || "") +
                  ":" +
                  (a.password ? unescape(encodeURIComponent(a.password)) : ""),
              ),
          ));
      let c;
      if (d.isFormData(n)) {
        if (P.hasStandardBrowserEnv || P.hasStandardBrowserWebWorkerEnv)
          i.setContentType(void 0);
        else if ((c = i.getContentType()) !== !1) {
          const [u, ...l] = c
            ? c
                .split(";")
                .map((f) => f.trim())
                .filter(Boolean)
            : [];
          i.setContentType([u || "multipart/form-data", ...l].join("; "));
        }
      }
      if (
        P.hasStandardBrowserEnv &&
        (r && d.isFunction(r) && (r = r(t)), r || (r !== !1 && Xo(t.url)))
      ) {
        const u = s && o && Qo.read(o);
        u && i.set(s, u);
      }
      return t;
    },
    ti =
      typeof XMLHttpRequest < "u" &&
      function (e) {
        return new Promise(function (n, r) {
          const s = Mn(e);
          let o = s.data;
          const i = x.from(s.headers).normalize();
          let {
              responseType: a,
              onUploadProgress: c,
              onDownloadProgress: u,
            } = s,
            l,
            f,
            m,
            p,
            h;
          function y() {
            (p && p(),
              h && h(),
              s.cancelToken && s.cancelToken.unsubscribe(l),
              s.signal && s.signal.removeEventListener("abort", l));
          }
          let g = new XMLHttpRequest();
          (g.open(s.method.toUpperCase(), s.url, !0), (g.timeout = s.timeout));
          function w() {
            if (!g) return;
            const R = x.from(
                "getAllResponseHeaders" in g && g.getAllResponseHeaders(),
              ),
              k = {
                data:
                  !a || a === "text" || a === "json"
                    ? g.responseText
                    : g.response,
                status: g.status,
                statusText: g.statusText,
                headers: R,
                config: e,
                request: g,
              };
            (xn(
              function (ue) {
                (n(ue), y());
              },
              function (ue) {
                (r(ue), y());
              },
              k,
            ),
              (g = null));
          }
          ("onloadend" in g
            ? (g.onloadend = w)
            : (g.onreadystatechange = function () {
                !g ||
                  g.readyState !== 4 ||
                  (g.status === 0 &&
                    !(g.responseURL && g.responseURL.indexOf("file:") === 0)) ||
                  setTimeout(w);
              }),
            (g.onabort = function () {
              g &&
                (r(new E("Request aborted", E.ECONNABORTED, e, g)), (g = null));
            }),
            (g.onerror = function () {
              (r(new E("Network Error", E.ERR_NETWORK, e, g)), (g = null));
            }),
            (g.ontimeout = function () {
              let V = s.timeout
                ? "timeout of " + s.timeout + "ms exceeded"
                : "timeout exceeded";
              const k = s.transitional || Cn;
              (s.timeoutErrorMessage && (V = s.timeoutErrorMessage),
                r(
                  new E(
                    V,
                    k.clarifyTimeoutError ? E.ETIMEDOUT : E.ECONNABORTED,
                    e,
                    g,
                  ),
                ),
                (g = null));
            }),
            o === void 0 && i.setContentType(null),
            "setRequestHeader" in g &&
              d.forEach(i.toJSON(), function (V, k) {
                g.setRequestHeader(k, V);
              }),
            d.isUndefined(s.withCredentials) ||
              (g.withCredentials = !!s.withCredentials),
            a && a !== "json" && (g.responseType = s.responseType),
            u && (([m, h] = Be(u, !0)), g.addEventListener("progress", m)),
            c &&
              g.upload &&
              (([f, p] = Be(c)),
              g.upload.addEventListener("progress", f),
              g.upload.addEventListener("loadend", p)),
            (s.cancelToken || s.signal) &&
              ((l = (R) => {
                g &&
                  (r(!R || R.type ? new fe(null, e, g) : R),
                  g.abort(),
                  (g = null));
              }),
              s.cancelToken && s.cancelToken.subscribe(l),
              s.signal &&
                (s.signal.aborted
                  ? l()
                  : s.signal.addEventListener("abort", l))));
          const v = Ko(s.url);
          if (v && P.protocols.indexOf(v) === -1) {
            r(new E("Unsupported protocol " + v + ":", E.ERR_BAD_REQUEST, e));
            return;
          }
          g.send(o || null);
        });
      },
    ni = (e, t) => {
      const { length: n } = (e = e ? e.filter(Boolean) : []);
      if (t || n) {
        let r = new AbortController(),
          s;
        const o = function (u) {
          if (!s) {
            ((s = !0), a());
            const l = u instanceof Error ? u : this.reason;
            r.abort(
              l instanceof E ? l : new fe(l instanceof Error ? l.message : l),
            );
          }
        };
        let i =
          t &&
          setTimeout(() => {
            ((i = null), o(new E(`timeout ${t} of ms exceeded`, E.ETIMEDOUT)));
          }, t);
        const a = () => {
          e &&
            (i && clearTimeout(i),
            (i = null),
            e.forEach((u) => {
              u.unsubscribe
                ? u.unsubscribe(o)
                : u.removeEventListener("abort", o);
            }),
            (e = null));
        };
        e.forEach((u) => u.addEventListener("abort", o));
        const { signal: c } = r;
        return ((c.unsubscribe = () => d.asap(a)), c);
      }
    },
    ri = function* (e, t) {
      let n = e.byteLength;
      if (n < t) {
        yield e;
        return;
      }
      let r = 0,
        s;
      for (; r < n; ) ((s = r + t), yield e.slice(r, s), (r = s));
    },
    si = async function* (e, t) {
      for await (const n of oi(e)) yield* ri(n, t);
    },
    oi = async function* (e) {
      if (e[Symbol.asyncIterator]) {
        yield* e;
        return;
      }
      const t = e.getReader();
      try {
        for (;;) {
          const { done: n, value: r } = await t.read();
          if (n) break;
          yield r;
        }
      } finally {
        await t.cancel();
      }
    },
    Fn = (e, t, n, r) => {
      const s = si(e, t);
      let o = 0,
        i,
        a = (c) => {
          i || ((i = !0), r && r(c));
        };
      return new ReadableStream(
        {
          async pull(c) {
            try {
              const { done: u, value: l } = await s.next();
              if (u) {
                (a(), c.close());
                return;
              }
              let f = l.byteLength;
              if (n) {
                let m = (o += f);
                n(m);
              }
              c.enqueue(new Uint8Array(l));
            } catch (u) {
              throw (a(u), u);
            }
          },
          cancel(c) {
            return (a(c), s.return());
          },
        },
        { highWaterMark: 2 },
      );
    },
    Ue =
      typeof fetch == "function" &&
      typeof Request == "function" &&
      typeof Response == "function",
    Bn = Ue && typeof ReadableStream == "function",
    ii =
      Ue &&
      (typeof TextEncoder == "function"
        ? (
            (e) => (t) =>
              e.encode(t)
          )(new TextEncoder())
        : async (e) => new Uint8Array(await new Response(e).arrayBuffer())),
    Un = (e, ...t) => {
      try {
        return !!e(...t);
      } catch {
        return !1;
      }
    },
    ai =
      Bn &&
      Un(() => {
        let e = !1;
        const t = new Request(P.origin, {
          body: new ReadableStream(),
          method: "POST",
          get duplex() {
            return ((e = !0), "half");
          },
        }).headers.has("Content-Type");
        return e && !t;
      }),
    $n = 64 * 1024,
    bt = Bn && Un(() => d.isReadableStream(new Response("").body)),
    $e = { stream: bt && ((e) => e.body) };
  Ue &&
    ((e) => {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((t) => {
        !$e[t] &&
          ($e[t] = d.isFunction(e[t])
            ? (n) => n[t]()
            : (n, r) => {
                throw new E(
                  `Response type '${t}' is not supported`,
                  E.ERR_NOT_SUPPORT,
                  r,
                );
              });
      });
    })(new Response());
  const ci = async (e) => {
      if (e == null) return 0;
      if (d.isBlob(e)) return e.size;
      if (d.isSpecCompliantForm(e))
        return (
          await new Request(P.origin, { method: "POST", body: e }).arrayBuffer()
        ).byteLength;
      if (d.isArrayBufferView(e) || d.isArrayBuffer(e)) return e.byteLength;
      if ((d.isURLSearchParams(e) && (e = e + ""), d.isString(e)))
        return (await ii(e)).byteLength;
    },
    ui = async (e, t) => {
      const n = d.toFiniteNumber(e.getContentLength());
      return n ?? ci(t);
    },
    wt = {
      http: Oo,
      xhr: ti,
      fetch:
        Ue &&
        (async (e) => {
          let {
            url: t,
            method: n,
            data: r,
            signal: s,
            cancelToken: o,
            timeout: i,
            onDownloadProgress: a,
            onUploadProgress: c,
            responseType: u,
            headers: l,
            withCredentials: f = "same-origin",
            fetchOptions: m,
          } = Mn(e);
          u = u ? (u + "").toLowerCase() : "text";
          let p = ni([s, o && o.toAbortSignal()], i),
            h;
          const y =
            p &&
            p.unsubscribe &&
            (() => {
              p.unsubscribe();
            });
          let g;
          try {
            if (
              c &&
              ai &&
              n !== "get" &&
              n !== "head" &&
              (g = await ui(l, r)) !== 0
            ) {
              let k = new Request(t, {
                  method: "POST",
                  body: r,
                  duplex: "half",
                }),
                Y;
              if (
                (d.isFormData(r) &&
                  (Y = k.headers.get("content-type")) &&
                  l.setContentType(Y),
                k.body)
              ) {
                const [ue, dt] = Dn(g, Be(kn(c)));
                r = Fn(k.body, $n, ue, dt);
              }
            }
            d.isString(f) || (f = f ? "include" : "omit");
            const w = "credentials" in Request.prototype;
            h = new Request(t, {
              ...m,
              signal: p,
              method: n.toUpperCase(),
              headers: l.normalize().toJSON(),
              body: r,
              duplex: "half",
              credentials: w ? f : void 0,
            });
            let v = await fetch(h);
            const R = bt && (u === "stream" || u === "response");
            if (bt && (a || (R && y))) {
              const k = {};
              ["status", "statusText", "headers"].forEach((ws) => {
                k[ws] = v[ws];
              });
              const Y = d.toFiniteNumber(v.headers.get("content-length")),
                [ue, dt] = (a && Dn(Y, Be(kn(a), !0))) || [];
              v = new Response(
                Fn(v.body, $n, ue, () => {
                  (dt && dt(), y && y());
                }),
                k,
              );
            }
            u = u || "text";
            let V = await $e[d.findKey($e, u) || "text"](v, e);
            return (
              !R && y && y(),
              await new Promise((k, Y) => {
                xn(k, Y, {
                  data: V,
                  headers: x.from(v.headers),
                  status: v.status,
                  statusText: v.statusText,
                  config: e,
                  request: h,
                });
              })
            );
          } catch (w) {
            throw (
              y && y(),
              w && w.name === "TypeError" && /fetch/i.test(w.message)
                ? Object.assign(new E("Network Error", E.ERR_NETWORK, e, h), {
                    cause: w.cause || w,
                  })
                : E.from(w, w && w.code, e, h)
            );
          }
        }),
    };
  d.forEach(wt, (e, t) => {
    if (e) {
      try {
        Object.defineProperty(e, "name", { value: t });
      } catch {}
      Object.defineProperty(e, "adapterName", { value: t });
    }
  });
  const jn = (e) => `- ${e}`,
    li = (e) => d.isFunction(e) || e === null || e === !1,
    Hn = {
      getAdapter: (e) => {
        e = d.isArray(e) ? e : [e];
        const { length: t } = e;
        let n, r;
        const s = {};
        for (let o = 0; o < t; o++) {
          n = e[o];
          let i;
          if (
            ((r = n),
            !li(n) && ((r = wt[(i = String(n)).toLowerCase()]), r === void 0))
          )
            throw new E(`Unknown adapter '${i}'`);
          if (r) break;
          s[i || "#" + o] = r;
        }
        if (!r) {
          const o = Object.entries(s).map(
            ([a, c]) =>
              `adapter ${a} ` +
              (c === !1
                ? "is not supported by the environment"
                : "is not available in the build"),
          );
          let i = t
            ? o.length > 1
              ? `since :
` +
                o.map(jn).join(`
`)
              : " " + jn(o[0])
            : "as no adapter specified";
          throw new E(
            "There is no suitable adapter to dispatch the request " + i,
            "ERR_NOT_SUPPORT",
          );
        }
        return r;
      },
      adapters: wt,
    };
  function Tt(e) {
    if (
      (e.cancelToken && e.cancelToken.throwIfRequested(),
      e.signal && e.signal.aborted)
    )
      throw new fe(null, e);
  }
  function qn(e) {
    return (
      Tt(e),
      (e.headers = x.from(e.headers)),
      (e.data = St.call(e, e.transformRequest)),
      ["post", "put", "patch"].indexOf(e.method) !== -1 &&
        e.headers.setContentType("application/x-www-form-urlencoded", !1),
      Hn.getAdapter(e.adapter || be.adapter)(e).then(
        function (r) {
          return (
            Tt(e),
            (r.data = St.call(e, e.transformResponse, r)),
            (r.headers = x.from(r.headers)),
            r
          );
        },
        function (r) {
          return (
            On(r) ||
              (Tt(e),
              r &&
                r.response &&
                ((r.response.data = St.call(
                  e,
                  e.transformResponse,
                  r.response,
                )),
                (r.response.headers = x.from(r.response.headers)))),
            Promise.reject(r)
          );
        },
      )
    );
  }
  const zn = "1.7.9",
    je = {};
  ["object", "boolean", "number", "function", "string", "symbol"].forEach(
    (e, t) => {
      je[e] = function (r) {
        return typeof r === e || "a" + (t < 1 ? "n " : " ") + e;
      };
    },
  );
  const Vn = {};
  ((je.transitional = function (t, n, r) {
    function s(o, i) {
      return (
        "[Axios v" +
        zn +
        "] Transitional option '" +
        o +
        "'" +
        i +
        (r ? ". " + r : "")
      );
    }
    return (o, i, a) => {
      if (t === !1)
        throw new E(
          s(i, " has been removed" + (n ? " in " + n : "")),
          E.ERR_DEPRECATED,
        );
      return (
        n &&
          !Vn[i] &&
          ((Vn[i] = !0),
          console.warn(
            s(
              i,
              " has been deprecated since v" +
                n +
                " and will be removed in the near future",
            ),
          )),
        t ? t(o, i, a) : !0
      );
    };
  }),
    (je.spelling = function (t) {
      return (n, r) => (
        console.warn(`${r} is likely a misspelling of ${t}`),
        !0
      );
    }));
  function di(e, t, n) {
    if (typeof e != "object")
      throw new E("options must be an object", E.ERR_BAD_OPTION_VALUE);
    const r = Object.keys(e);
    let s = r.length;
    for (; s-- > 0; ) {
      const o = r[s],
        i = t[o];
      if (i) {
        const a = e[o],
          c = a === void 0 || i(a, o, e);
        if (c !== !0)
          throw new E("option " + o + " must be " + c, E.ERR_BAD_OPTION_VALUE);
        continue;
      }
      if (n !== !0) throw new E("Unknown option " + o, E.ERR_BAD_OPTION);
    }
  }
  const He = { assertOptions: di, validators: je },
    U = He.validators;
  class ee {
    constructor(t) {
      ((this.defaults = t),
        (this.interceptors = { request: new Rn(), response: new Rn() }));
    }
    async request(t, n) {
      try {
        return await this._request(t, n);
      } catch (r) {
        if (r instanceof Error) {
          let s = {};
          Error.captureStackTrace
            ? Error.captureStackTrace(s)
            : (s = new Error());
          const o = s.stack ? s.stack.replace(/^.+\n/, "") : "";
          try {
            r.stack
              ? o &&
                !String(r.stack).endsWith(o.replace(/^.+\n.+\n/, "")) &&
                (r.stack +=
                  `
` + o)
              : (r.stack = o);
          } catch {}
        }
        throw r;
      }
    }
    _request(t, n) {
      (typeof t == "string" ? ((n = n || {}), (n.url = t)) : (n = t || {}),
        (n = Z(this.defaults, n)));
      const { transitional: r, paramsSerializer: s, headers: o } = n;
      (r !== void 0 &&
        He.assertOptions(
          r,
          {
            silentJSONParsing: U.transitional(U.boolean),
            forcedJSONParsing: U.transitional(U.boolean),
            clarifyTimeoutError: U.transitional(U.boolean),
          },
          !1,
        ),
        s != null &&
          (d.isFunction(s)
            ? (n.paramsSerializer = { serialize: s })
            : He.assertOptions(
                s,
                { encode: U.function, serialize: U.function },
                !0,
              )),
        He.assertOptions(
          n,
          {
            baseUrl: U.spelling("baseURL"),
            withXsrfToken: U.spelling("withXSRFToken"),
          },
          !0,
        ),
        (n.method = (n.method || this.defaults.method || "get").toLowerCase()));
      let i = o && d.merge(o.common, o[n.method]);
      (o &&
        d.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (h) => {
            delete o[h];
          },
        ),
        (n.headers = x.concat(i, o)));
      const a = [];
      let c = !0;
      this.interceptors.request.forEach(function (y) {
        (typeof y.runWhen == "function" && y.runWhen(n) === !1) ||
          ((c = c && y.synchronous), a.unshift(y.fulfilled, y.rejected));
      });
      const u = [];
      this.interceptors.response.forEach(function (y) {
        u.push(y.fulfilled, y.rejected);
      });
      let l,
        f = 0,
        m;
      if (!c) {
        const h = [qn.bind(this), void 0];
        for (
          h.unshift.apply(h, a),
            h.push.apply(h, u),
            m = h.length,
            l = Promise.resolve(n);
          f < m;
        )
          l = l.then(h[f++], h[f++]);
        return l;
      }
      m = a.length;
      let p = n;
      for (f = 0; f < m; ) {
        const h = a[f++],
          y = a[f++];
        try {
          p = h(p);
        } catch (g) {
          y.call(this, g);
          break;
        }
      }
      try {
        l = qn.call(this, p);
      } catch (h) {
        return Promise.reject(h);
      }
      for (f = 0, m = u.length; f < m; ) l = l.then(u[f++], u[f++]);
      return l;
    }
    getUri(t) {
      t = Z(this.defaults, t);
      const n = Nn(t.baseURL, t.url);
      return An(n, t.params, t.paramsSerializer);
    }
  }
  (d.forEach(["delete", "get", "head", "options"], function (t) {
    ee.prototype[t] = function (n, r) {
      return this.request(
        Z(r || {}, { method: t, url: n, data: (r || {}).data }),
      );
    };
  }),
    d.forEach(["post", "put", "patch"], function (t) {
      function n(r) {
        return function (o, i, a) {
          return this.request(
            Z(a || {}, {
              method: t,
              headers: r ? { "Content-Type": "multipart/form-data" } : {},
              url: o,
              data: i,
            }),
          );
        };
      }
      ((ee.prototype[t] = n()), (ee.prototype[t + "Form"] = n(!0)));
    }));
  class vt {
    constructor(t) {
      if (typeof t != "function")
        throw new TypeError("executor must be a function.");
      let n;
      this.promise = new Promise(function (o) {
        n = o;
      });
      const r = this;
      (this.promise.then((s) => {
        if (!r._listeners) return;
        let o = r._listeners.length;
        for (; o-- > 0; ) r._listeners[o](s);
        r._listeners = null;
      }),
        (this.promise.then = (s) => {
          let o;
          const i = new Promise((a) => {
            (r.subscribe(a), (o = a));
          }).then(s);
          return (
            (i.cancel = function () {
              r.unsubscribe(o);
            }),
            i
          );
        }),
        t(function (o, i, a) {
          r.reason || ((r.reason = new fe(o, i, a)), n(r.reason));
        }));
    }
    throwIfRequested() {
      if (this.reason) throw this.reason;
    }
    subscribe(t) {
      if (this.reason) {
        t(this.reason);
        return;
      }
      this._listeners ? this._listeners.push(t) : (this._listeners = [t]);
    }
    unsubscribe(t) {
      if (!this._listeners) return;
      const n = this._listeners.indexOf(t);
      n !== -1 && this._listeners.splice(n, 1);
    }
    toAbortSignal() {
      const t = new AbortController(),
        n = (r) => {
          t.abort(r);
        };
      return (
        this.subscribe(n),
        (t.signal.unsubscribe = () => this.unsubscribe(n)),
        t.signal
      );
    }
    static source() {
      let t;
      return {
        token: new vt(function (s) {
          t = s;
        }),
        cancel: t,
      };
    }
  }
  function fi(e) {
    return function (n) {
      return e.apply(null, n);
    };
  }
  function pi(e) {
    return d.isObject(e) && e.isAxiosError === !0;
  }
  const At = {
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511,
  };
  Object.entries(At).forEach(([e, t]) => {
    At[t] = e;
  });
  function Gn(e) {
    const t = new ee(e),
      n = un(ee.prototype.request, t);
    return (
      d.extend(n, ee.prototype, t, { allOwnKeys: !0 }),
      d.extend(n, t, null, { allOwnKeys: !0 }),
      (n.create = function (s) {
        return Gn(Z(e, s));
      }),
      n
    );
  }
  const C = Gn(be);
  ((C.Axios = ee),
    (C.CanceledError = fe),
    (C.CancelToken = vt),
    (C.isCancel = On),
    (C.VERSION = zn),
    (C.toFormData = Me),
    (C.AxiosError = E),
    (C.Cancel = C.CanceledError),
    (C.all = function (t) {
      return Promise.all(t);
    }),
    (C.spread = fi),
    (C.isAxiosError = pi),
    (C.mergeConfig = Z),
    (C.AxiosHeaders = x),
    (C.formToJSON = (e) => In(d.isHTMLForm(e) ? new FormData(e) : e)),
    (C.getAdapter = Hn.getAdapter),
    (C.HttpStatusCode = At),
    (C.default = C));
  const Wn = C.create({ baseURL: "https://api.applixir.com" }),
    hi = async (e) => (await Wn.get(`/api/v1/games/vast/${e}`)).data,
    mi = `
    <div id="videoplayer-container" class="applixir-hide-element applixir-backdrop">
      <div id="videoplayer">
        <video id="content" src="https://cdn.applixir.com/blank.mp4"></video>
        <div id="adcontainer"></div>
        <button id="playpause" title="Play/Pause">&#9654;</button>
        <button id="applixir-close" title="Close" class="applixir-hide-element">&#215;</button>
        <img id="applixir-logo" src="https://cdn.applixir.com/applixir-logo.svg" alt="Applixir Logo"></img>
        <div id="applixir-spinner-container" class="applixir-hide-element">
          <div id="applixir-spinner"></div>
        </div>
      </div>
    </div>
`,
    gi = `
  <div id="applixir-thank-you-modal-container" class="applixir-hide-element applixir-backdrop">
    <div id="applixir-thank-you-modal">
      <div id="applixir-thank-you-modal-content">
        <h2 id="applixir-thank-you-modal-title">Video Completed</h2>
        <p id="applixir-thank-you-modal-body">Thank you for Watching!</p>
      </div>
      <div id="applixir-thank-you-modal-footer">
        <button id="applixir-thank-you-modal-close-button">Close</button>
      </div>
    </div>
  </div>
`,
    yi = `
  <div id="applixir-confirm-modal-container" class="applixir-hide-element applixir-backdrop">
    <div id="applixir-confirm-modal">
      <div id="applixir-confirm-modal-content">
        <h2 id="applixir-confirm-modal-title">Close Video</h2>
        <p id="applixir-confirm-modal-body">Are You Sure you want to Close it?</p>
      </div>
      <div id="applixir-confirm-modal-footer">
        <button id="applixir-confirm-modal-close-button">CLOSE</button>
        <button id="applixir-confirm-modal-resume-button">RESUME PLAYING</button>
      </div>
    </div>
  </div>
`;
  function qe({
    id: e,
    src: t,
    code: n,
    async: r = !0,
    type: s = "text/javascript",
  }) {
    return new Promise((o, i) => {
      const a = document.createElement("script");
      ((a.id = e),
        (a.type = s),
        (a.async = r),
        t
          ? ((a.src = t),
            (a.onload = o),
            (a.onerror = i),
            document.head.appendChild(a))
          : n
            ? ((a.innerHTML = n), document.head.appendChild(a), o())
            : i(new Error("No src or code provided for script")));
    });
  }
  const _i = () => {
      if (window.googletag && window.googletag.apiReady)
        return Promise.resolve();
      const e = qe({
          src: "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
          async: !1,
        }),
        t = qe({
          src: "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
          crossOrigin: "anonymous",
        });
      return Promise.all([e, t]).then(() => {
        ((window.googletag = window.googletag || {}),
          (window.googletag.cmd = window.googletag.cmd || []));
      });
    },
    Ei = () =>
      new Promise((e, t) => {
        const n = document.createElement("link");
        ((n.rel = "stylesheet"),
          (n.type = "text/css"),
          (n.href =
            "https://s3.us-east-1.amazonaws.com/cdn.applixir.com/applixir.styles.v6.0.1.css"),
          (n.onload = e),
          (n.onerror = t),
          document.head.appendChild(n));
      });
  class Si {
    constructor(t) {
      ((this.application = t),
        (this.modalContainerDiv = Ds()),
        (this.modalDiv = ks()),
        (this.modalCloseButton = Ls()),
        (this.modalBodyParagraph = Ns()),
        this.modalCloseButton.addEventListener("click", () => {
          this.hide();
        }));
    }
    show() {
      this.modalContainerDiv.classList.remove("applixir-hide-element");
    }
    hide() {
      const t = this.application.adStatusCallbackFn;
      (t && t({ type: "thankYouModalClosed" }),
        this.modalContainerDiv.classList.add("applixir-hide-element"));
    }
  }
  const Kn = (e) => {
    var t;
    ((t = e.ads_) == null || t.destroy(),
      (e.playing_ = !1),
      (e.adsActive_ = !1),
      (e.adsDone_ = !1),
      (e.ads_ = new xe(e, e.videoPlayer_)));
  };
  class bi {
    constructor(t, n) {
      ((this.application = t),
        (this.ads = n),
        (this.modalContainerDiv = Ms()),
        (this.modalDiv = Fs()),
        (this.modalCloseButton = Us()),
        (this.modalResumeButton = $s()),
        (this.modalBodyParagraph = Bs()),
        this.modalCloseButton.addEventListener("click", () => {
          this.closeClick();
        }),
        this.modalResumeButton.addEventListener("click", () => {
          this.resumePlayingClick();
        }));
    }
    show() {
      this.modalContainerDiv.classList.remove("applixir-hide-element");
    }
    hide() {
      this.modalContainerDiv.classList.add("applixir-hide-element");
    }
    resumePlayingClick() {
      (this.hide(), this.application.startOrToggleImaAds());
    }
    closeClick() {
      const t = this.application.adStatusCallbackFn;
      (this.application.videoPlayer_.videoPlayerContainer_.classList.add(
        "applixir-hide-element",
      ),
        this.hide(),
        t && t({ type: "manuallyEnded" }),
        Kn(this.application),
        this.application.updatePlayButton(),
        this.application.resizePlayerAndAds());
    }
  }
  class wi {
    constructor(t) {
      vs(this, lt);
      const n = this;
      ((this.application = t),
        (this.videoPlayer_ = t.videoPlayer_),
        (this.logger = t.logger),
        (this.rewardedSlot = null),
        (this.adUnitPath = As(this, lt, Rs).call(this)),
        this.adUnitPath &&
          (googletag.cmd.push(function () {
            const r = googletag.defineOutOfPageSlot(
              n.adUnitPath,
              googletag.enums.OutOfPageFormat.REWARDED,
            );
            (r && (r.addService(googletag.pubads()), (n.rewardedSlot = r)),
              googletag.pubads().disableInitialLoad(),
              googletag.enableServices());
          }),
          googletag
            .pubads()
            .addEventListener("rewardedSlotReady", function (r) {
              r.makeRewardedVisible();
            }),
          googletag.pubads().addEventListener("rewardedSlotGranted", (r) => {
            const s = r.slot.getSlotElementId();
            (document.getElementById(s).remove(), this.application.adWatched());
          }),
          googletag.pubads().addEventListener("rewardedSlotClosed", (r) => {
            this.application.adStatusCallbackFn({ type: "manuallyEnded" });
          })));
    }
    startGptAds() {
      (googletag.display(this.rewardedSlot),
        googletag.pubads().refresh([this.rewardedSlot]),
        setTimeout(async () => {
          this.rewardedSlot.getResponseInformation() == null &&
            (this.logger.log("GptAds: No ad response, running IMA"),
            this.videoPlayer_.videoPlayerContainer_.classList.remove(
              "applixir-hide-element",
            ),
            await this.application.startOrToggleImaAds());
        }, 500));
    }
  }
  ((lt = new WeakSet()),
    (Rs = function () {
      const t = this.application.iu;
      return t || "";
    }));
  const Ti = (e) => new Promise((t) => setTimeout(t, e)),
    vi =
      '(function(){function i(e){if(!window.frames[e]){if(document.body&&document.body.firstChild){var t=document.body;var n=document.createElement("iframe");n.style.display="none";n.name=e;n.title=e;t.insertBefore(n,t.firstChild)}else{setTimeout(function(){i(e)},5)}}}function e(n,o,r,f,s){function e(e,t,n,i){if(typeof n!=="function"){return}if(!window[o]){window[o]=[]}var a=false;if(s){a=s(e,i,n)}if(!a){window[o].push({command:e,version:t,callback:n,parameter:i})}}e.stub=true;e.stubVersion=2;function t(i){if(!window[n]||window[n].stub!==true){return}if(!i.data){return}var a=typeof i.data==="string";var e;try{e=a?JSON.parse(i.data):i.data}catch(t){return}if(e[r]){var o=e[r];window[n](o.command,o.version,function(e,t){var n={};n[f]={returnValue:e,success:t,callId:o.callId};if(i.source){i.source.postMessage(a?JSON.stringify(n):n,"*")}},o.parameter)}}if(typeof window[n]!=="function"){window[n]=e;if(window.addEventListener){window.addEventListener("message",t,false)}else{window.attachEvent("onmessage",t)}}}e("__tcfapi","__tcfapiBuffer","__tcfapiCall","__tcfapiReturn");i("__tcfapiLocator")})();',
    Ai =
      '(function(){(function(e){var r=document.createElement("link");r.rel="preconnect";r.as="script";var t=document.createElement("link");t.rel="dns-prefetch";t.as="script";var n=document.createElement("script");n.id="spcloader";n.type="text/javascript";n["async"]=true;n.charset="utf-8";var o="https://sdk.privacy-center.org/"+e+"/loader.js?target="+document.location.hostname;if(window.didomiConfig&&window.didomiConfig.user){var i=window.didomiConfig.user;var a=i.country;var c=i.region;if(a){o=o+"&country="+a;if(c){o=o+"&region="+c}}}r.href="https://sdk.privacy-center.org/";t.href="https://sdk.privacy-center.org/";n.src=o;var d=document.getElementsByTagName("script")[0];d.parentNode.insertBefore(r,d);d.parentNode.insertBefore(t,d);d.parentNode.insertBefore(n,d)})("047804da-144e-43f7-8038-a18881d270a1")})();',
    Ri = () => {
      if (
        document.getElementById("applixir-didomi-1") ||
        document.getElementById("applixir-didomi-2")
      )
        return Promise.resolve();
      ((window.didomiConfig = {
        app: { apiKey: "047804da-144e-43f7-8038-a18881d270a1" },
        notice: { enable: !0 },
      }),
        (window.didomiEventListeners = window.didomiEventListeners || []),
        (window.didomiOnReady = window.didomiOnReady || []));
      const e = new Promise((r) => {
          window.didomiOnReady.push(function (s) {
            (cn().classList.add("applixir-hide-element"), r());
          });
        }),
        t = qe({ id: "applixir-didomi-2", code: Ai }),
        n = qe({ id: "applixir-didomi-1", code: vi });
      return Promise.all([t, n, e]);
    },
    Ci = () => {
      if (typeof Didomi > "u") return !1;
      const e = Didomi.getUserStatus(),
        t = Didomi.shouldUserStatusBeCollected();
      return e.purposes.consent.enabled.length > 0 && !t;
    },
    Ii = () =>
      typeof Didomi > "u" ? { user_id: null } : Didomi.getUserStatus(),
    Pi = () => {
      cn().classList.remove("applixir-hide-element");
    },
    Oi = (e) => {
      window.didomiEventListeners.push({
        event: "consent.changed",
        listener: le(e, function () {
          if (typeof Didomi > "u") return;
          Didomi.getUserStatus().purposes.consent.enabled.length > 0
            ? e.openPlayer()
            : (e.adStatusCallbackFn({ type: "consentDeclined" }),
              Didomi.reset());
        }),
      });
    },
    xi = async (e, t, n) => {
      const r = { apiKey: e };
      return (
        t && (r.userId = t),
        n && (r.customData = n),
        (await Wn.post("/api/v1/callbacks", r)).data
      );
    },
    S = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__,
    te = "9.19.0",
    b = globalThis;
  function ze() {
    return (Ve(b), b);
  }
  function Ve(e) {
    const t = (e.__SENTRY__ = e.__SENTRY__ || {});
    return ((t.version = t.version || te), (t[te] = t[te] || {}));
  }
  function Ge(e, t, n = b) {
    const r = (n.__SENTRY__ = n.__SENTRY__ || {}),
      s = (r[te] = r[te] || {});
    return s[e] || (s[e] = t());
  }
  const Jn = Object.prototype.toString;
  function Rt(e) {
    switch (Jn.call(e)) {
      case "[object Error]":
      case "[object Exception]":
      case "[object DOMException]":
      case "[object WebAssembly.Exception]":
        return !0;
      default:
        return G(e, Error);
    }
  }
  function pe(e, t) {
    return Jn.call(e) === `[object ${t}]`;
  }
  function Yn(e) {
    return pe(e, "ErrorEvent");
  }
  function Xn(e) {
    return pe(e, "DOMError");
  }
  function Di(e) {
    return pe(e, "DOMException");
  }
  function $(e) {
    return pe(e, "String");
  }
  function Ct(e) {
    return (
      typeof e == "object" &&
      e !== null &&
      "__sentry_template_string__" in e &&
      "__sentry_template_values__" in e
    );
  }
  function It(e) {
    return (
      e === null || Ct(e) || (typeof e != "object" && typeof e != "function")
    );
  }
  function Te(e) {
    return pe(e, "Object");
  }
  function We(e) {
    return typeof Event < "u" && G(e, Event);
  }
  function ki(e) {
    return typeof Element < "u" && G(e, Element);
  }
  function Ni(e) {
    return pe(e, "RegExp");
  }
  function Ke(e) {
    return !!(e != null && e.then && typeof e.then == "function");
  }
  function Li(e) {
    return (
      Te(e) &&
      "nativeEvent" in e &&
      "preventDefault" in e &&
      "stopPropagation" in e
    );
  }
  function G(e, t) {
    try {
      return e instanceof t;
    } catch {
      return !1;
    }
  }
  function Qn(e) {
    return !!(typeof e == "object" && e !== null && (e.__isVue || e._isVue));
  }
  function Mi(e) {
    return typeof Request < "u" && G(e, Request);
  }
  const Pt = b,
    Fi = 80;
  function Zn(e, t = {}) {
    if (!e) return "<unknown>";
    try {
      let n = e;
      const r = 5,
        s = [];
      let o = 0,
        i = 0;
      const a = " > ",
        c = a.length;
      let u;
      const l = Array.isArray(t) ? t : t.keyAttrs,
        f = (!Array.isArray(t) && t.maxStringLength) || Fi;
      for (
        ;
        n &&
        o++ < r &&
        ((u = Bi(n, l)),
        !(u === "html" || (o > 1 && i + s.length * c + u.length >= f)));
      )
        (s.push(u), (i += u.length), (n = n.parentNode));
      return s.reverse().join(a);
    } catch {
      return "<unknown>";
    }
  }
  function Bi(e, t) {
    const n = e,
      r = [];
    if (!(n != null && n.tagName)) return "";
    if (Pt.HTMLElement && n instanceof HTMLElement && n.dataset) {
      if (n.dataset.sentryComponent) return n.dataset.sentryComponent;
      if (n.dataset.sentryElement) return n.dataset.sentryElement;
    }
    r.push(n.tagName.toLowerCase());
    const s =
      t != null && t.length
        ? t.filter((i) => n.getAttribute(i)).map((i) => [i, n.getAttribute(i)])
        : null;
    if (s != null && s.length)
      s.forEach((i) => {
        r.push(`[${i[0]}="${i[1]}"]`);
      });
    else {
      n.id && r.push(`#${n.id}`);
      const i = n.className;
      if (i && $(i)) {
        const a = i.split(/\s+/);
        for (const c of a) r.push(`.${c}`);
      }
    }
    const o = ["aria-label", "type", "name", "title", "alt"];
    for (const i of o) {
      const a = n.getAttribute(i);
      a && r.push(`[${i}="${a}"]`);
    }
    return r.join("");
  }
  function Ot() {
    try {
      return Pt.document.location.href;
    } catch {
      return "";
    }
  }
  function Ui(e) {
    if (!Pt.HTMLElement) return null;
    let t = e;
    const n = 5;
    for (let r = 0; r < n; r++) {
      if (!t) return null;
      if (t instanceof HTMLElement) {
        if (t.dataset.sentryComponent) return t.dataset.sentryComponent;
        if (t.dataset.sentryElement) return t.dataset.sentryElement;
      }
      t = t.parentNode;
    }
    return null;
  }
  const $i = "Sentry Logger ",
    xt = ["debug", "info", "warn", "error", "log", "assert", "trace"],
    Je = {};
  function he(e) {
    if (!("console" in b)) return e();
    const t = b.console,
      n = {},
      r = Object.keys(Je);
    r.forEach((s) => {
      const o = Je[s];
      ((n[s] = t[s]), (t[s] = o));
    });
    try {
      return e();
    } finally {
      r.forEach((s) => {
        t[s] = n[s];
      });
    }
  }
  function ji() {
    let e = !1;
    const t = {
      enable: () => {
        e = !0;
      },
      disable: () => {
        e = !1;
      },
      isEnabled: () => e,
    };
    return (
      S
        ? xt.forEach((n) => {
            t[n] = (...r) => {
              e &&
                he(() => {
                  b.console[n](`${$i}[${n}]:`, ...r);
                });
            };
          })
        : xt.forEach((n) => {
            t[n] = () => {};
          }),
      t
    );
  }
  const _ = Ge("logger", ji);
  function Ye(e, t = 0) {
    return typeof e != "string" || t === 0 || e.length <= t
      ? e
      : `${e.slice(0, t)}...`;
  }
  function er(e, t) {
    if (!Array.isArray(e)) return "";
    const n = [];
    for (let r = 0; r < e.length; r++) {
      const s = e[r];
      try {
        Qn(s) ? n.push("[VueViewModel]") : n.push(String(s));
      } catch {
        n.push("[value cannot be serialized]");
      }
    }
    return n.join(t);
  }
  function Hi(e, t, n = !1) {
    return $(e)
      ? Ni(t)
        ? t.test(e)
        : $(t)
          ? n
            ? e === t
            : e.includes(t)
          : !1
      : !1;
  }
  function Xe(e, t = [], n = !1) {
    return t.some((r) => Hi(e, r, n));
  }
  function L(e, t, n) {
    if (!(t in e)) return;
    const r = e[t];
    if (typeof r != "function") return;
    const s = n(r);
    typeof s == "function" && tr(s, r);
    try {
      e[t] = s;
    } catch {
      S && _.log(`Failed to replace method "${t}" in object`, e);
    }
  }
  function ne(e, t, n) {
    try {
      Object.defineProperty(e, t, { value: n, writable: !0, configurable: !0 });
    } catch {
      S && _.log(`Failed to add non-enumerable property "${t}" to object`, e);
    }
  }
  function tr(e, t) {
    try {
      const n = t.prototype || {};
      ((e.prototype = t.prototype = n), ne(e, "__sentry_original__", t));
    } catch {}
  }
  function Dt(e) {
    return e.__sentry_original__;
  }
  function nr(e) {
    if (Rt(e))
      return { message: e.message, name: e.name, stack: e.stack, ...sr(e) };
    if (We(e)) {
      const t = {
        type: e.type,
        target: rr(e.target),
        currentTarget: rr(e.currentTarget),
        ...sr(e),
      };
      return (
        typeof CustomEvent < "u" && G(e, CustomEvent) && (t.detail = e.detail),
        t
      );
    } else return e;
  }
  function rr(e) {
    try {
      return ki(e) ? Zn(e) : Object.prototype.toString.call(e);
    } catch {
      return "<unknown>";
    }
  }
  function sr(e) {
    if (typeof e == "object" && e !== null) {
      const t = {};
      for (const n in e)
        Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
      return t;
    } else return {};
  }
  function qi(e, t = 40) {
    const n = Object.keys(nr(e));
    n.sort();
    const r = n[0];
    if (!r) return "[object has no keys]";
    if (r.length >= t) return Ye(r, t);
    for (let s = n.length; s > 0; s--) {
      const o = n.slice(0, s).join(", ");
      if (!(o.length > t)) return s === n.length ? o : Ye(o, t);
    }
    return "";
  }
  function zi() {
    const e = b;
    return e.crypto || e.msCrypto;
  }
  function M(e = zi()) {
    let t = () => Math.random() * 16;
    try {
      if (e != null && e.randomUUID) return e.randomUUID().replace(/-/g, "");
      e != null &&
        e.getRandomValues &&
        (t = () => {
          const n = new Uint8Array(1);
          return (e.getRandomValues(n), n[0]);
        });
    } catch {}
    return ("10000000100040008000" + 1e11).replace(/[018]/g, (n) =>
      (n ^ ((t() & 15) >> (n / 4))).toString(16),
    );
  }
  function or(e) {
    var t, n;
    return (n = (t = e.exception) == null ? void 0 : t.values) == null
      ? void 0
      : n[0];
  }
  function re(e) {
    const { message: t, event_id: n } = e;
    if (t) return t;
    const r = or(e);
    return r
      ? r.type && r.value
        ? `${r.type}: ${r.value}`
        : r.type || r.value || n || "<unknown>"
      : n || "<unknown>";
  }
  function kt(e, t, n) {
    const r = (e.exception = e.exception || {}),
      s = (r.values = r.values || []),
      o = (s[0] = s[0] || {});
    (o.value || (o.value = t || ""), o.type || (o.type = "Error"));
  }
  function me(e, t) {
    const n = or(e);
    if (!n) return;
    const r = { type: "generic", handled: !0 },
      s = n.mechanism;
    if (((n.mechanism = { ...r, ...s, ...t }), t && "data" in t)) {
      const o = { ...(s == null ? void 0 : s.data), ...t.data };
      n.mechanism.data = o;
    }
  }
  function ir(e) {
    if (Vi(e)) return !0;
    try {
      ne(e, "__sentry_captured__", !0);
    } catch {}
    return !1;
  }
  function Vi(e) {
    try {
      return e.__sentry_captured__;
    } catch {}
  }
  const ar = 1e3;
  function ve() {
    return Date.now() / ar;
  }
  function Gi() {
    const { performance: e } = b;
    if (!(e != null && e.now)) return ve;
    const t = Date.now() - e.now(),
      n = e.timeOrigin == null ? t : e.timeOrigin;
    return () => (n + e.now()) / ar;
  }
  const j = Gi();
  function Wi(e) {
    const t = j(),
      n = {
        sid: M(),
        init: !0,
        timestamp: t,
        started: t,
        duration: 0,
        status: "ok",
        errors: 0,
        ignoreDuration: !1,
        toJSON: () => Ji(n),
      };
    return (ge(n, e), n);
  }
  function ge(e, t = {}) {
    if (
      (t.user &&
        (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address),
        !e.did &&
          !t.did &&
          (e.did = t.user.id || t.user.email || t.user.username)),
      (e.timestamp = t.timestamp || j()),
      t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism),
      t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration),
      t.sid && (e.sid = t.sid.length === 32 ? t.sid : M()),
      t.init !== void 0 && (e.init = t.init),
      !e.did && t.did && (e.did = `${t.did}`),
      typeof t.started == "number" && (e.started = t.started),
      e.ignoreDuration)
    )
      e.duration = void 0;
    else if (typeof t.duration == "number") e.duration = t.duration;
    else {
      const n = e.timestamp - e.started;
      e.duration = n >= 0 ? n : 0;
    }
    (t.release && (e.release = t.release),
      t.environment && (e.environment = t.environment),
      !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress),
      !e.userAgent && t.userAgent && (e.userAgent = t.userAgent),
      typeof t.errors == "number" && (e.errors = t.errors),
      t.status && (e.status = t.status));
  }
  function Ki(e, t) {
    let n = {};
    (e.status === "ok" && (n = { status: "exited" }), ge(e, n));
  }
  function Ji(e) {
    return {
      sid: `${e.sid}`,
      init: e.init,
      started: new Date(e.started * 1e3).toISOString(),
      timestamp: new Date(e.timestamp * 1e3).toISOString(),
      status: e.status,
      errors: e.errors,
      did:
        typeof e.did == "number" || typeof e.did == "string"
          ? `${e.did}`
          : void 0,
      duration: e.duration,
      abnormal_mechanism: e.abnormal_mechanism,
      attrs: {
        release: e.release,
        environment: e.environment,
        ip_address: e.ipAddress,
        user_agent: e.userAgent,
      },
    };
  }
  function Ae(e, t, n = 2) {
    if (!t || typeof t != "object" || n <= 0) return t;
    if (e && Object.keys(t).length === 0) return e;
    const r = { ...e };
    for (const s in t)
      Object.prototype.hasOwnProperty.call(t, s) &&
        (r[s] = Ae(r[s], t[s], n - 1));
    return r;
  }
  const Nt = "_sentrySpan";
  function cr(e, t) {
    t ? ne(e, Nt, t) : delete e[Nt];
  }
  function ur(e) {
    return e[Nt];
  }
  function lr() {
    return M();
  }
  function dr() {
    return M().substring(16);
  }
  const Yi = 100;
  class H {
    constructor() {
      ((this._notifyingListeners = !1),
        (this._scopeListeners = []),
        (this._eventProcessors = []),
        (this._breadcrumbs = []),
        (this._attachments = []),
        (this._user = {}),
        (this._tags = {}),
        (this._extra = {}),
        (this._contexts = {}),
        (this._sdkProcessingMetadata = {}),
        (this._propagationContext = {
          traceId: lr(),
          sampleRand: Math.random(),
        }));
    }
    clone() {
      const t = new H();
      return (
        (t._breadcrumbs = [...this._breadcrumbs]),
        (t._tags = { ...this._tags }),
        (t._extra = { ...this._extra }),
        (t._contexts = { ...this._contexts }),
        this._contexts.flags &&
          (t._contexts.flags = { values: [...this._contexts.flags.values] }),
        (t._user = this._user),
        (t._level = this._level),
        (t._session = this._session),
        (t._transactionName = this._transactionName),
        (t._fingerprint = this._fingerprint),
        (t._eventProcessors = [...this._eventProcessors]),
        (t._attachments = [...this._attachments]),
        (t._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }),
        (t._propagationContext = { ...this._propagationContext }),
        (t._client = this._client),
        (t._lastEventId = this._lastEventId),
        cr(t, ur(this)),
        t
      );
    }
    setClient(t) {
      this._client = t;
    }
    setLastEventId(t) {
      this._lastEventId = t;
    }
    getClient() {
      return this._client;
    }
    lastEventId() {
      return this._lastEventId;
    }
    addScopeListener(t) {
      this._scopeListeners.push(t);
    }
    addEventProcessor(t) {
      return (this._eventProcessors.push(t), this);
    }
    setUser(t) {
      return (
        (this._user = t || {
          email: void 0,
          id: void 0,
          ip_address: void 0,
          username: void 0,
        }),
        this._session && ge(this._session, { user: t }),
        this._notifyScopeListeners(),
        this
      );
    }
    getUser() {
      return this._user;
    }
    setTags(t) {
      return (
        (this._tags = { ...this._tags, ...t }),
        this._notifyScopeListeners(),
        this
      );
    }
    setTag(t, n) {
      return (
        (this._tags = { ...this._tags, [t]: n }),
        this._notifyScopeListeners(),
        this
      );
    }
    setExtras(t) {
      return (
        (this._extra = { ...this._extra, ...t }),
        this._notifyScopeListeners(),
        this
      );
    }
    setExtra(t, n) {
      return (
        (this._extra = { ...this._extra, [t]: n }),
        this._notifyScopeListeners(),
        this
      );
    }
    setFingerprint(t) {
      return ((this._fingerprint = t), this._notifyScopeListeners(), this);
    }
    setLevel(t) {
      return ((this._level = t), this._notifyScopeListeners(), this);
    }
    setTransactionName(t) {
      return ((this._transactionName = t), this._notifyScopeListeners(), this);
    }
    setContext(t, n) {
      return (
        n === null ? delete this._contexts[t] : (this._contexts[t] = n),
        this._notifyScopeListeners(),
        this
      );
    }
    setSession(t) {
      return (
        t ? (this._session = t) : delete this._session,
        this._notifyScopeListeners(),
        this
      );
    }
    getSession() {
      return this._session;
    }
    update(t) {
      if (!t) return this;
      const n = typeof t == "function" ? t(this) : t,
        r = n instanceof H ? n.getScopeData() : Te(n) ? t : void 0,
        {
          tags: s,
          extra: o,
          user: i,
          contexts: a,
          level: c,
          fingerprint: u = [],
          propagationContext: l,
        } = r || {};
      return (
        (this._tags = { ...this._tags, ...s }),
        (this._extra = { ...this._extra, ...o }),
        (this._contexts = { ...this._contexts, ...a }),
        i && Object.keys(i).length && (this._user = i),
        c && (this._level = c),
        u.length && (this._fingerprint = u),
        l && (this._propagationContext = l),
        this
      );
    }
    clear() {
      return (
        (this._breadcrumbs = []),
        (this._tags = {}),
        (this._extra = {}),
        (this._user = {}),
        (this._contexts = {}),
        (this._level = void 0),
        (this._transactionName = void 0),
        (this._fingerprint = void 0),
        (this._session = void 0),
        cr(this, void 0),
        (this._attachments = []),
        this.setPropagationContext({
          traceId: lr(),
          sampleRand: Math.random(),
        }),
        this._notifyScopeListeners(),
        this
      );
    }
    addBreadcrumb(t, n) {
      var o;
      const r = typeof n == "number" ? n : Yi;
      if (r <= 0) return this;
      const s = {
        timestamp: ve(),
        ...t,
        message: t.message ? Ye(t.message, 2048) : t.message,
      };
      return (
        this._breadcrumbs.push(s),
        this._breadcrumbs.length > r &&
          ((this._breadcrumbs = this._breadcrumbs.slice(-r)),
          (o = this._client) == null ||
            o.recordDroppedEvent("buffer_overflow", "log_item")),
        this._notifyScopeListeners(),
        this
      );
    }
    getLastBreadcrumb() {
      return this._breadcrumbs[this._breadcrumbs.length - 1];
    }
    clearBreadcrumbs() {
      return ((this._breadcrumbs = []), this._notifyScopeListeners(), this);
    }
    addAttachment(t) {
      return (this._attachments.push(t), this);
    }
    clearAttachments() {
      return ((this._attachments = []), this);
    }
    getScopeData() {
      return {
        breadcrumbs: this._breadcrumbs,
        attachments: this._attachments,
        contexts: this._contexts,
        tags: this._tags,
        extra: this._extra,
        user: this._user,
        level: this._level,
        fingerprint: this._fingerprint || [],
        eventProcessors: this._eventProcessors,
        propagationContext: this._propagationContext,
        sdkProcessingMetadata: this._sdkProcessingMetadata,
        transactionName: this._transactionName,
        span: ur(this),
      };
    }
    setSDKProcessingMetadata(t) {
      return (
        (this._sdkProcessingMetadata = Ae(this._sdkProcessingMetadata, t, 2)),
        this
      );
    }
    setPropagationContext(t) {
      return ((this._propagationContext = t), this);
    }
    getPropagationContext() {
      return this._propagationContext;
    }
    captureException(t, n) {
      const r = (n == null ? void 0 : n.event_id) || M();
      if (!this._client)
        return (
          _.warn("No client configured on scope - will not capture exception!"),
          r
        );
      const s = new Error("Sentry syntheticException");
      return (
        this._client.captureException(
          t,
          { originalException: t, syntheticException: s, ...n, event_id: r },
          this,
        ),
        r
      );
    }
    captureMessage(t, n, r) {
      const s = (r == null ? void 0 : r.event_id) || M();
      if (!this._client)
        return (
          _.warn("No client configured on scope - will not capture message!"),
          s
        );
      const o = new Error(t);
      return (
        this._client.captureMessage(
          t,
          n,
          { originalException: t, syntheticException: o, ...r, event_id: s },
          this,
        ),
        s
      );
    }
    captureEvent(t, n) {
      const r = (n == null ? void 0 : n.event_id) || M();
      return this._client
        ? (this._client.captureEvent(t, { ...n, event_id: r }, this), r)
        : (_.warn("No client configured on scope - will not capture event!"),
          r);
    }
    _notifyScopeListeners() {
      this._notifyingListeners ||
        ((this._notifyingListeners = !0),
        this._scopeListeners.forEach((t) => {
          t(this);
        }),
        (this._notifyingListeners = !1));
    }
  }
  function Xi() {
    return Ge("defaultCurrentScope", () => new H());
  }
  function Qi() {
    return Ge("defaultIsolationScope", () => new H());
  }
  class Zi {
    constructor(t, n) {
      let r;
      t ? (r = t) : (r = new H());
      let s;
      (n ? (s = n) : (s = new H()),
        (this._stack = [{ scope: r }]),
        (this._isolationScope = s));
    }
    withScope(t) {
      const n = this._pushScope();
      let r;
      try {
        r = t(n);
      } catch (s) {
        throw (this._popScope(), s);
      }
      return Ke(r)
        ? r.then(
            (s) => (this._popScope(), s),
            (s) => {
              throw (this._popScope(), s);
            },
          )
        : (this._popScope(), r);
    }
    getClient() {
      return this.getStackTop().client;
    }
    getScope() {
      return this.getStackTop().scope;
    }
    getIsolationScope() {
      return this._isolationScope;
    }
    getStackTop() {
      return this._stack[this._stack.length - 1];
    }
    _pushScope() {
      const t = this.getScope().clone();
      return (this._stack.push({ client: this.getClient(), scope: t }), t);
    }
    _popScope() {
      return this._stack.length <= 1 ? !1 : !!this._stack.pop();
    }
  }
  function ye() {
    const e = ze(),
      t = Ve(e);
    return (t.stack = t.stack || new Zi(Xi(), Qi()));
  }
  function ea(e) {
    return ye().withScope(e);
  }
  function ta(e, t) {
    const n = ye();
    return n.withScope(() => ((n.getStackTop().scope = e), t(e)));
  }
  function fr(e) {
    return ye().withScope(() => e(ye().getIsolationScope()));
  }
  function na() {
    return {
      withIsolationScope: fr,
      withScope: ea,
      withSetScope: ta,
      withSetIsolationScope: (e, t) => fr(t),
      getCurrentScope: () => ye().getScope(),
      getIsolationScope: () => ye().getIsolationScope(),
    };
  }
  function Lt(e) {
    const t = Ve(e);
    return t.acs ? t.acs : na();
  }
  function W() {
    const e = ze();
    return Lt(e).getCurrentScope();
  }
  function Re() {
    const e = ze();
    return Lt(e).getIsolationScope();
  }
  function ra() {
    return Ge("globalScope", () => new H());
  }
  function sa(...e) {
    const t = ze(),
      n = Lt(t);
    if (e.length === 2) {
      const [r, s] = e;
      return r ? n.withSetScope(r, s) : n.withScope(s);
    }
    return n.withScope(e[0]);
  }
  function O() {
    return W().getClient();
  }
  function oa(e) {
    const t = e.getPropagationContext(),
      { traceId: n, parentSpanId: r, propagationSpanId: s } = t,
      o = { trace_id: n, span_id: s || dr() };
    return (r && (o.parent_span_id = r), o);
  }
  const ia = "sentry.source",
    aa = "sentry.sample_rate",
    ca = "sentry.previous_trace_sample_rate",
    ua = "sentry.op",
    la = "sentry.origin",
    pr = "sentry.profile_id",
    hr = "sentry.exclusive_time",
    da = 0,
    fa = 1,
    pa = "_sentryScope",
    ha = "_sentryIsolationScope";
  function mr(e) {
    return { scope: e[pa], isolationScope: e[ha] };
  }
  function ma(e) {
    if (typeof e == "boolean") return Number(e);
    const t = typeof e == "string" ? parseFloat(e) : e;
    if (!(typeof t != "number" || isNaN(t) || t < 0 || t > 1)) return t;
  }
  const ga = "sentry-",
    ya = /^sentry-/;
  function _a(e) {
    const t = Ea(e);
    if (!t) return;
    const n = Object.entries(t).reduce((r, [s, o]) => {
      if (s.match(ya)) {
        const i = s.slice(ga.length);
        r[i] = o;
      }
      return r;
    }, {});
    if (Object.keys(n).length > 0) return n;
  }
  function Ea(e) {
    if (!(!e || (!$(e) && !Array.isArray(e))))
      return Array.isArray(e)
        ? e.reduce((t, n) => {
            const r = gr(n);
            return (
              Object.entries(r).forEach(([s, o]) => {
                t[s] = o;
              }),
              t
            );
          }, {})
        : gr(e);
  }
  function gr(e) {
    return e
      .split(",")
      .map((t) =>
        t.split("=").map((n) => {
          try {
            return decodeURIComponent(n.trim());
          } catch {
            return;
          }
        }),
      )
      .reduce((t, [n, r]) => (n && r && (t[n] = r), t), {});
  }
  const yr = 1;
  let _r = !1;
  function Sa(e) {
    const { spanId: t, traceId: n, isRemote: r } = e.spanContext(),
      s = r ? t : Mt(e).parent_span_id,
      o = mr(e).scope,
      i = r
        ? (o == null ? void 0 : o.getPropagationContext().propagationSpanId) ||
          dr()
        : t;
    return { parent_span_id: s, span_id: i, trace_id: n };
  }
  function ba(e) {
    if (e && e.length > 0)
      return e.map(
        ({
          context: { spanId: t, traceId: n, traceFlags: r, ...s },
          attributes: o,
        }) => ({
          span_id: t,
          trace_id: n,
          sampled: r === yr,
          attributes: o,
          ...s,
        }),
      );
  }
  function Er(e) {
    return typeof e == "number"
      ? Sr(e)
      : Array.isArray(e)
        ? e[0] + e[1] / 1e9
        : e instanceof Date
          ? Sr(e.getTime())
          : j();
  }
  function Sr(e) {
    return e > 9999999999 ? e / 1e3 : e;
  }
  function Mt(e) {
    var r;
    if (Ta(e)) return e.getSpanJSON();
    const { spanId: t, traceId: n } = e.spanContext();
    if (wa(e)) {
      const {
          attributes: s,
          startTime: o,
          name: i,
          endTime: a,
          status: c,
          links: u,
        } = e,
        l =
          "parentSpanId" in e
            ? e.parentSpanId
            : "parentSpanContext" in e
              ? (r = e.parentSpanContext) == null
                ? void 0
                : r.spanId
              : void 0;
      return {
        span_id: t,
        trace_id: n,
        data: s,
        description: i,
        parent_span_id: l,
        start_timestamp: Er(o),
        timestamp: Er(a) || void 0,
        status: Aa(c),
        op: s[ua],
        origin: s[la],
        links: ba(u),
      };
    }
    return { span_id: t, trace_id: n, start_timestamp: 0, data: {} };
  }
  function wa(e) {
    const t = e;
    return (
      !!t.attributes && !!t.startTime && !!t.name && !!t.endTime && !!t.status
    );
  }
  function Ta(e) {
    return typeof e.getSpanJSON == "function";
  }
  function va(e) {
    const { traceFlags: t } = e.spanContext();
    return t === yr;
  }
  function Aa(e) {
    if (!(!e || e.code === da))
      return e.code === fa ? "ok" : e.message || "unknown_error";
  }
  const Ra = "_sentryRootSpan";
  function br(e) {
    return e[Ra] || e;
  }
  function wr() {
    _r ||
      (he(() => {
        console.warn(
          "[Sentry] Returning null from `beforeSendSpan` is disallowed. To drop certain spans, configure the respective integrations directly.",
        );
      }),
      (_r = !0));
  }
  const Tr = 50,
    se = "?",
    vr = /\(error: (.*)\)/,
    Ar = /captureMessage|captureException/;
  function Rr(...e) {
    const t = e.sort((n, r) => n[0] - r[0]).map((n) => n[1]);
    return (n, r = 0, s = 0) => {
      const o = [],
        i = n.split(`
`);
      for (let a = r; a < i.length; a++) {
        const c = i[a];
        if (c.length > 1024) continue;
        const u = vr.test(c) ? c.replace(vr, "$1") : c;
        if (!u.match(/\S*Error: /)) {
          for (const l of t) {
            const f = l(u);
            if (f) {
              o.push(f);
              break;
            }
          }
          if (o.length >= Tr + s) break;
        }
      }
      return Ia(o.slice(s));
    };
  }
  function Ca(e) {
    return Array.isArray(e) ? Rr(...e) : e;
  }
  function Ia(e) {
    if (!e.length) return [];
    const t = Array.from(e);
    return (
      /sentryWrapped/.test(Qe(t).function || "") && t.pop(),
      t.reverse(),
      Ar.test(Qe(t).function || "") &&
        (t.pop(), Ar.test(Qe(t).function || "") && t.pop()),
      t
        .slice(0, Tr)
        .map((n) => ({
          ...n,
          filename: n.filename || Qe(t).filename,
          function: n.function || se,
        }))
    );
  }
  function Qe(e) {
    return e[e.length - 1] || {};
  }
  const Ft = "<anonymous>";
  function K(e) {
    try {
      return !e || typeof e != "function" ? Ft : e.name || Ft;
    } catch {
      return Ft;
    }
  }
  function Cr(e) {
    const t = e.exception;
    if (t) {
      const n = [];
      try {
        return (
          t.values.forEach((r) => {
            r.stacktrace.frames && n.push(...r.stacktrace.frames);
          }),
          n
        );
      } catch {
        return;
      }
    }
  }
  const Ze = {},
    Ir = {};
  function oe(e, t) {
    ((Ze[e] = Ze[e] || []), Ze[e].push(t));
  }
  function ie(e, t) {
    if (!Ir[e]) {
      Ir[e] = !0;
      try {
        t();
      } catch (n) {
        S && _.error(`Error while instrumenting ${e}`, n);
      }
    }
  }
  function B(e, t) {
    const n = e && Ze[e];
    if (n)
      for (const r of n)
        try {
          r(t);
        } catch (s) {
          S &&
            _.error(
              `Error while triggering instrumentation handler.
Type: ${e}
Name: ${K(r)}
Error:`,
              s,
            );
        }
  }
  let Bt = null;
  function Pa(e) {
    const t = "error";
    (oe(t, e), ie(t, Oa));
  }
  function Oa() {
    ((Bt = b.onerror),
      (b.onerror = function (e, t, n, r, s) {
        return (
          B("error", { column: r, error: s, line: n, msg: e, url: t }),
          Bt ? Bt.apply(this, arguments) : !1
        );
      }),
      (b.onerror.__SENTRY_INSTRUMENTED__ = !0));
  }
  let Ut = null;
  function xa(e) {
    const t = "unhandledrejection";
    (oe(t, e), ie(t, Da));
  }
  function Da() {
    ((Ut = b.onunhandledrejection),
      (b.onunhandledrejection = function (e) {
        return (
          B("unhandledrejection", e),
          Ut ? Ut.apply(this, arguments) : !0
        );
      }),
      (b.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0));
  }
  function ka(e) {
    var n;
    if (typeof __SENTRY_TRACING__ == "boolean" && !__SENTRY_TRACING__)
      return !1;
    const t = e || ((n = O()) == null ? void 0 : n.getOptions());
    return !!t && (t.tracesSampleRate != null || !!t.tracesSampler);
  }
  const $t = "production",
    Na = "_frozenDsc";
  function Pr(e, t) {
    const n = t.getOptions(),
      { publicKey: r } = t.getDsn() || {},
      s = {
        environment: n.environment || $t,
        release: n.release,
        public_key: r,
        trace_id: e,
      };
    return (t.emit("createDsc", s), s);
  }
  function La(e, t) {
    const n = t.getPropagationContext();
    return n.dsc || Pr(n.traceId, e);
  }
  function Ma(e) {
    var h;
    const t = O();
    if (!t) return {};
    const n = br(e),
      r = Mt(n),
      s = r.data,
      o = n.spanContext().traceState,
      i = (o == null ? void 0 : o.get("sentry.sample_rate")) ?? s[aa] ?? s[ca];
    function a(y) {
      return (
        (typeof i == "number" || typeof i == "string") &&
          (y.sample_rate = `${i}`),
        y
      );
    }
    const c = n[Na];
    if (c) return a(c);
    const u = o == null ? void 0 : o.get("sentry.dsc"),
      l = u && _a(u);
    if (l) return a(l);
    const f = Pr(e.spanContext().traceId, t),
      m = s[ia],
      p = r.description;
    return (
      m !== "url" && p && (f.transaction = p),
      ka() &&
        ((f.sampled = String(va(n))),
        (f.sample_rand =
          (o == null ? void 0 : o.get("sentry.sample_rand")) ??
          ((h = mr(n).scope) == null
            ? void 0
            : h.getPropagationContext().sampleRand.toString()))),
      a(f),
      t.emit("createDsc", f, n),
      f
    );
  }
  const Fa = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
  function Ba(e) {
    return e === "http" || e === "https";
  }
  function et(e, t = !1) {
    const {
      host: n,
      path: r,
      pass: s,
      port: o,
      projectId: i,
      protocol: a,
      publicKey: c,
    } = e;
    return `${a}://${c}${t && s ? `:${s}` : ""}@${n}${o ? `:${o}` : ""}/${r && `${r}/`}${i}`;
  }
  function Ua(e) {
    const t = Fa.exec(e);
    if (!t) {
      he(() => {
        console.error(`Invalid Sentry Dsn: ${e}`);
      });
      return;
    }
    const [n, r, s = "", o = "", i = "", a = ""] = t.slice(1);
    let c = "",
      u = a;
    const l = u.split("/");
    if ((l.length > 1 && ((c = l.slice(0, -1).join("/")), (u = l.pop())), u)) {
      const f = u.match(/^\d+/);
      f && (u = f[0]);
    }
    return Or({
      host: o,
      pass: s,
      path: c,
      projectId: u,
      port: i,
      protocol: n,
      publicKey: r,
    });
  }
  function Or(e) {
    return {
      protocol: e.protocol,
      publicKey: e.publicKey || "",
      pass: e.pass || "",
      host: e.host,
      port: e.port || "",
      path: e.path || "",
      projectId: e.projectId,
    };
  }
  function $a(e) {
    if (!S) return !0;
    const { port: t, projectId: n, protocol: r } = e;
    return ["protocol", "publicKey", "host", "projectId"].find((i) =>
      e[i] ? !1 : (_.error(`Invalid Sentry Dsn: ${i} missing`), !0),
    )
      ? !1
      : n.match(/^\d+$/)
        ? Ba(r)
          ? t && isNaN(parseInt(t, 10))
            ? (_.error(`Invalid Sentry Dsn: Invalid port ${t}`), !1)
            : !0
          : (_.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1)
        : (_.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
  }
  function ja(e) {
    const t = typeof e == "string" ? Ua(e) : Or(e);
    if (!(!t || !$a(t))) return t;
  }
  function q(e, t = 100, n = 1 / 0) {
    try {
      return jt("", e, t, n);
    } catch (r) {
      return { ERROR: `**non-serializable** (${r})` };
    }
  }
  function xr(e, t = 3, n = 100 * 1024) {
    const r = q(e, t);
    return Va(r) > n ? xr(e, t - 1, n) : r;
  }
  function jt(e, t, n = 1 / 0, r = 1 / 0, s = Ga()) {
    const [o, i] = s;
    if (
      t == null ||
      ["boolean", "string"].includes(typeof t) ||
      (typeof t == "number" && Number.isFinite(t))
    )
      return t;
    const a = Ha(e, t);
    if (!a.startsWith("[object ")) return a;
    if (t.__sentry_skip_normalization__) return t;
    const c =
      typeof t.__sentry_override_normalization_depth__ == "number"
        ? t.__sentry_override_normalization_depth__
        : n;
    if (c === 0) return a.replace("object ", "");
    if (o(t)) return "[Circular ~]";
    const u = t;
    if (u && typeof u.toJSON == "function")
      try {
        const p = u.toJSON();
        return jt("", p, c - 1, r, s);
      } catch {}
    const l = Array.isArray(t) ? [] : {};
    let f = 0;
    const m = nr(t);
    for (const p in m) {
      if (!Object.prototype.hasOwnProperty.call(m, p)) continue;
      if (f >= r) {
        l[p] = "[MaxProperties ~]";
        break;
      }
      const h = m[p];
      ((l[p] = jt(p, h, c - 1, r, s)), f++);
    }
    return (i(t), l);
  }
  function Ha(e, t) {
    try {
      if (e === "domain" && t && typeof t == "object" && t._events)
        return "[Domain]";
      if (e === "domainEmitter") return "[DomainEmitter]";
      if (typeof global < "u" && t === global) return "[Global]";
      if (typeof window < "u" && t === window) return "[Window]";
      if (typeof document < "u" && t === document) return "[Document]";
      if (Qn(t)) return "[VueViewModel]";
      if (Li(t)) return "[SyntheticEvent]";
      if (typeof t == "number" && !Number.isFinite(t)) return `[${t}]`;
      if (typeof t == "function") return `[Function: ${K(t)}]`;
      if (typeof t == "symbol") return `[${String(t)}]`;
      if (typeof t == "bigint") return `[BigInt: ${String(t)}]`;
      const n = qa(t);
      return /^HTML(\w*)Element$/.test(n)
        ? `[HTMLElement: ${n}]`
        : `[object ${n}]`;
    } catch (n) {
      return `**non-serializable** (${n})`;
    }
  }
  function qa(e) {
    const t = Object.getPrototypeOf(e);
    return t != null && t.constructor ? t.constructor.name : "null prototype";
  }
  function za(e) {
    return ~-encodeURI(e).split(/%..|./).length;
  }
  function Va(e) {
    return za(JSON.stringify(e));
  }
  function Ga() {
    const e = new WeakSet();
    function t(r) {
      return e.has(r) ? !0 : (e.add(r), !1);
    }
    function n(r) {
      e.delete(r);
    }
    return [t, n];
  }
  function Ce(e, t = []) {
    return [e, t];
  }
  function Wa(e, t) {
    const [n, r] = e;
    return [n, [...r, t]];
  }
  function Dr(e, t) {
    const n = e[1];
    for (const r of n) {
      const s = r[0].type;
      if (t(r, s)) return !0;
    }
    return !1;
  }
  function Ht(e) {
    const t = Ve(b);
    return t.encodePolyfill ? t.encodePolyfill(e) : new TextEncoder().encode(e);
  }
  function Ka(e) {
    const [t, n] = e;
    let r = JSON.stringify(t);
    function s(o) {
      typeof r == "string"
        ? (r = typeof o == "string" ? r + o : [Ht(r), o])
        : r.push(typeof o == "string" ? Ht(o) : o);
    }
    for (const o of n) {
      const [i, a] = o;
      if (
        (s(`
${JSON.stringify(i)}
`),
        typeof a == "string" || a instanceof Uint8Array)
      )
        s(a);
      else {
        let c;
        try {
          c = JSON.stringify(a);
        } catch {
          c = JSON.stringify(q(a));
        }
        s(c);
      }
    }
    return typeof r == "string" ? r : Ja(r);
  }
  function Ja(e) {
    const t = e.reduce((s, o) => s + o.length, 0),
      n = new Uint8Array(t);
    let r = 0;
    for (const s of e) (n.set(s, r), (r += s.length));
    return n;
  }
  function Ya(e) {
    const t = typeof e.data == "string" ? Ht(e.data) : e.data;
    return [
      {
        type: "attachment",
        length: t.length,
        filename: e.filename,
        content_type: e.contentType,
        attachment_type: e.attachmentType,
      },
      t,
    ];
  }
  const Xa = {
    session: "session",
    sessions: "session",
    attachment: "attachment",
    transaction: "transaction",
    event: "error",
    client_report: "internal",
    user_report: "default",
    profile: "profile",
    profile_chunk: "profile",
    replay_event: "replay",
    replay_recording: "replay",
    check_in: "monitor",
    feedback: "feedback",
    span: "span",
    raw_security: "security",
    log: "log_item",
  };
  function kr(e) {
    return Xa[e];
  }
  function Nr(e) {
    if (!(e != null && e.sdk)) return;
    const { name: t, version: n } = e.sdk;
    return { name: t, version: n };
  }
  function Qa(e, t, n, r) {
    var o;
    const s =
      (o = e.sdkProcessingMetadata) == null ? void 0 : o.dynamicSamplingContext;
    return {
      event_id: e.event_id,
      sent_at: new Date().toISOString(),
      ...(t && { sdk: t }),
      ...(!!n && r && { dsn: et(r) }),
      ...(s && { trace: s }),
    };
  }
  function Za(e, t) {
    return (
      t &&
        ((e.sdk = e.sdk || {}),
        (e.sdk.name = e.sdk.name || t.name),
        (e.sdk.version = e.sdk.version || t.version),
        (e.sdk.integrations = [
          ...(e.sdk.integrations || []),
          ...(t.integrations || []),
        ]),
        (e.sdk.packages = [...(e.sdk.packages || []), ...(t.packages || [])])),
      e
    );
  }
  function ec(e, t, n, r) {
    const s = Nr(n),
      o = {
        sent_at: new Date().toISOString(),
        ...(s && { sdk: s }),
        ...(!!r && t && { dsn: et(t) }),
      },
      i =
        "aggregates" in e
          ? [{ type: "sessions" }, e]
          : [{ type: "session" }, e.toJSON()];
    return Ce(o, [i]);
  }
  function tc(e, t, n, r) {
    const s = Nr(n),
      o = e.type && e.type !== "replay_event" ? e.type : "event";
    Za(e, n == null ? void 0 : n.sdk);
    const i = Qa(e, s, r, t);
    return (delete e.sdkProcessingMetadata, Ce(i, [[{ type: o }, e]]));
  }
  var z;
  (function (e) {
    e[(e.PENDING = 0)] = "PENDING";
    const n = 1;
    e[(e.RESOLVED = n)] = "RESOLVED";
    const r = 2;
    e[(e.REJECTED = r)] = "REJECTED";
  })(z || (z = {}));
  function ae(e) {
    return new J((t) => {
      t(e);
    });
  }
  function tt(e) {
    return new J((t, n) => {
      n(e);
    });
  }
  class J {
    constructor(t) {
      ((this._state = z.PENDING), (this._handlers = []), this._runExecutor(t));
    }
    then(t, n) {
      return new J((r, s) => {
        (this._handlers.push([
          !1,
          (o) => {
            if (!t) r(o);
            else
              try {
                r(t(o));
              } catch (i) {
                s(i);
              }
          },
          (o) => {
            if (!n) s(o);
            else
              try {
                r(n(o));
              } catch (i) {
                s(i);
              }
          },
        ]),
          this._executeHandlers());
      });
    }
    catch(t) {
      return this.then((n) => n, t);
    }
    finally(t) {
      return new J((n, r) => {
        let s, o;
        return this.then(
          (i) => {
            ((o = !1), (s = i), t && t());
          },
          (i) => {
            ((o = !0), (s = i), t && t());
          },
        ).then(() => {
          if (o) {
            r(s);
            return;
          }
          n(s);
        });
      });
    }
    _executeHandlers() {
      if (this._state === z.PENDING) return;
      const t = this._handlers.slice();
      ((this._handlers = []),
        t.forEach((n) => {
          n[0] ||
            (this._state === z.RESOLVED && n[1](this._value),
            this._state === z.REJECTED && n[2](this._value),
            (n[0] = !0));
        }));
    }
    _runExecutor(t) {
      const n = (o, i) => {
          if (this._state === z.PENDING) {
            if (Ke(i)) {
              i.then(r, s);
              return;
            }
            ((this._state = o), (this._value = i), this._executeHandlers());
          }
        },
        r = (o) => {
          n(z.RESOLVED, o);
        },
        s = (o) => {
          n(z.REJECTED, o);
        };
      try {
        t(r, s);
      } catch (o) {
        s(o);
      }
    }
  }
  function qt(e, t, n, r = 0) {
    return new J((s, o) => {
      const i = e[r];
      if (t === null || typeof i != "function") s(t);
      else {
        const a = i({ ...t }, n);
        (S &&
          i.id &&
          a === null &&
          _.log(`Event processor "${i.id}" dropped event`),
          Ke(a)
            ? a.then((c) => qt(e, c, n, r + 1).then(s)).then(null, o)
            : qt(e, a, n, r + 1)
                .then(s)
                .then(null, o));
      }
    });
  }
  let nt, Lr, rt;
  function nc(e) {
    const t = b._sentryDebugIds;
    if (!t) return {};
    const n = Object.keys(t);
    return (
      (rt && n.length === Lr) ||
        ((Lr = n.length),
        (rt = n.reduce((r, s) => {
          nt || (nt = {});
          const o = nt[s];
          if (o) r[o[0]] = o[1];
          else {
            const i = e(s);
            for (let a = i.length - 1; a >= 0; a--) {
              const c = i[a],
                u = c == null ? void 0 : c.filename,
                l = t[s];
              if (u && l) {
                ((r[u] = l), (nt[s] = [u, l]));
                break;
              }
            }
          }
          return r;
        }, {}))),
      rt
    );
  }
  function rc(e, t) {
    const {
      fingerprint: n,
      span: r,
      breadcrumbs: s,
      sdkProcessingMetadata: o,
    } = t;
    (sc(e, t), r && ac(e, r), cc(e, n), oc(e, s), ic(e, o));
  }
  function Mr(e, t) {
    const {
      extra: n,
      tags: r,
      user: s,
      contexts: o,
      level: i,
      sdkProcessingMetadata: a,
      breadcrumbs: c,
      fingerprint: u,
      eventProcessors: l,
      attachments: f,
      propagationContext: m,
      transactionName: p,
      span: h,
    } = t;
    (st(e, "extra", n),
      st(e, "tags", r),
      st(e, "user", s),
      st(e, "contexts", o),
      (e.sdkProcessingMetadata = Ae(e.sdkProcessingMetadata, a, 2)),
      i && (e.level = i),
      p && (e.transactionName = p),
      h && (e.span = h),
      c.length && (e.breadcrumbs = [...e.breadcrumbs, ...c]),
      u.length && (e.fingerprint = [...e.fingerprint, ...u]),
      l.length && (e.eventProcessors = [...e.eventProcessors, ...l]),
      f.length && (e.attachments = [...e.attachments, ...f]),
      (e.propagationContext = { ...e.propagationContext, ...m }));
  }
  function st(e, t, n) {
    e[t] = Ae(e[t], n, 1);
  }
  function sc(e, t) {
    const {
      extra: n,
      tags: r,
      user: s,
      contexts: o,
      level: i,
      transactionName: a,
    } = t;
    (Object.keys(n).length && (e.extra = { ...n, ...e.extra }),
      Object.keys(r).length && (e.tags = { ...r, ...e.tags }),
      Object.keys(s).length && (e.user = { ...s, ...e.user }),
      Object.keys(o).length && (e.contexts = { ...o, ...e.contexts }),
      i && (e.level = i),
      a && e.type !== "transaction" && (e.transaction = a));
  }
  function oc(e, t) {
    const n = [...(e.breadcrumbs || []), ...t];
    e.breadcrumbs = n.length ? n : void 0;
  }
  function ic(e, t) {
    e.sdkProcessingMetadata = { ...e.sdkProcessingMetadata, ...t };
  }
  function ac(e, t) {
    ((e.contexts = { trace: Sa(t), ...e.contexts }),
      (e.sdkProcessingMetadata = {
        dynamicSamplingContext: Ma(t),
        ...e.sdkProcessingMetadata,
      }));
    const n = br(t),
      r = Mt(n).description;
    r && !e.transaction && e.type === "transaction" && (e.transaction = r);
  }
  function cc(e, t) {
    ((e.fingerprint = e.fingerprint
      ? Array.isArray(e.fingerprint)
        ? e.fingerprint
        : [e.fingerprint]
      : []),
      t && (e.fingerprint = e.fingerprint.concat(t)),
      e.fingerprint.length || delete e.fingerprint);
  }
  function uc(e, t, n, r, s, o) {
    const { normalizeDepth: i = 3, normalizeMaxBreadth: a = 1e3 } = e,
      c = {
        ...t,
        event_id: t.event_id || n.event_id || M(),
        timestamp: t.timestamp || ve(),
      },
      u = n.integrations || e.integrations.map((g) => g.name);
    (lc(c, e),
      pc(c, u),
      s && s.emit("applyFrameMetadata", t),
      t.type === void 0 && dc(c, e.stackParser));
    const l = mc(r, n.captureContext);
    n.mechanism && me(c, n.mechanism);
    const f = s ? s.getEventProcessors() : [],
      m = ra().getScopeData();
    if (o) {
      const g = o.getScopeData();
      Mr(m, g);
    }
    if (l) {
      const g = l.getScopeData();
      Mr(m, g);
    }
    const p = [...(n.attachments || []), ...m.attachments];
    (p.length && (n.attachments = p), rc(c, m));
    const h = [...f, ...m.eventProcessors];
    return qt(h, c, n).then(
      (g) => (g && fc(g), typeof i == "number" && i > 0 ? hc(g, i, a) : g),
    );
  }
  function lc(e, t) {
    const { environment: n, release: r, dist: s, maxValueLength: o = 250 } = t;
    ((e.environment = e.environment || n || $t),
      !e.release && r && (e.release = r),
      !e.dist && s && (e.dist = s));
    const i = e.request;
    i != null && i.url && (i.url = Ye(i.url, o));
  }
  function dc(e, t) {
    var r, s;
    const n = nc(t);
    (s = (r = e.exception) == null ? void 0 : r.values) == null ||
      s.forEach((o) => {
        var i, a;
        (a = (i = o.stacktrace) == null ? void 0 : i.frames) == null ||
          a.forEach((c) => {
            c.filename && (c.debug_id = n[c.filename]);
          });
      });
  }
  function fc(e) {
    var r, s;
    const t = {};
    if (
      ((s = (r = e.exception) == null ? void 0 : r.values) == null ||
        s.forEach((o) => {
          var i, a;
          (a = (i = o.stacktrace) == null ? void 0 : i.frames) == null ||
            a.forEach((c) => {
              c.debug_id &&
                (c.abs_path
                  ? (t[c.abs_path] = c.debug_id)
                  : c.filename && (t[c.filename] = c.debug_id),
                delete c.debug_id);
            });
        }),
      Object.keys(t).length === 0)
    )
      return;
    ((e.debug_meta = e.debug_meta || {}),
      (e.debug_meta.images = e.debug_meta.images || []));
    const n = e.debug_meta.images;
    Object.entries(t).forEach(([o, i]) => {
      n.push({ type: "sourcemap", code_file: o, debug_id: i });
    });
  }
  function pc(e, t) {
    t.length > 0 &&
      ((e.sdk = e.sdk || {}),
      (e.sdk.integrations = [...(e.sdk.integrations || []), ...t]));
  }
  function hc(e, t, n) {
    var s, o;
    if (!e) return null;
    const r = {
      ...e,
      ...(e.breadcrumbs && {
        breadcrumbs: e.breadcrumbs.map((i) => ({
          ...i,
          ...(i.data && { data: q(i.data, t, n) }),
        })),
      }),
      ...(e.user && { user: q(e.user, t, n) }),
      ...(e.contexts && { contexts: q(e.contexts, t, n) }),
      ...(e.extra && { extra: q(e.extra, t, n) }),
    };
    return (
      (s = e.contexts) != null &&
        s.trace &&
        r.contexts &&
        ((r.contexts.trace = e.contexts.trace),
        e.contexts.trace.data &&
          (r.contexts.trace.data = q(e.contexts.trace.data, t, n))),
      e.spans &&
        (r.spans = e.spans.map((i) => ({
          ...i,
          ...(i.data && { data: q(i.data, t, n) }),
        }))),
      (o = e.contexts) != null &&
        o.flags &&
        r.contexts &&
        (r.contexts.flags = q(e.contexts.flags, 3, n)),
      r
    );
  }
  function mc(e, t) {
    if (!t) return e;
    const n = e ? e.clone() : new H();
    return (n.update(t), n);
  }
  function Gl(e) {}
  function gc(e, t) {
    return W().captureException(e, void 0);
  }
  function Fr(e, t) {
    return W().captureEvent(e, t);
  }
  function Br(e) {
    const t = Re(),
      n = W(),
      { userAgent: r } = b.navigator || {},
      s = Wi({
        user: n.getUser() || t.getUser(),
        ...(r && { userAgent: r }),
        ...e,
      }),
      o = t.getSession();
    return (
      (o == null ? void 0 : o.status) === "ok" && ge(o, { status: "exited" }),
      Ur(),
      t.setSession(s),
      s
    );
  }
  function Ur() {
    const e = Re(),
      n = W().getSession() || e.getSession();
    (n && Ki(n), $r(), e.setSession());
  }
  function $r() {
    const e = Re(),
      t = O(),
      n = e.getSession();
    n && t && t.captureSession(n);
  }
  function jr(e = !1) {
    if (e) {
      Ur();
      return;
    }
    $r();
  }
  const yc = "7";
  function _c(e) {
    const t = e.protocol ? `${e.protocol}:` : "",
      n = e.port ? `:${e.port}` : "";
    return `${t}//${e.host}${n}${e.path ? `/${e.path}` : ""}/api/`;
  }
  function Ec(e) {
    return `${_c(e)}${e.projectId}/envelope/`;
  }
  function Sc(e, t) {
    const n = { sentry_version: yc };
    return (
      e.publicKey && (n.sentry_key = e.publicKey),
      t && (n.sentry_client = `${t.name}/${t.version}`),
      new URLSearchParams(n).toString()
    );
  }
  function bc(e, t, n) {
    return t || `${Ec(e)}?${Sc(e, n)}`;
  }
  const Hr = [];
  function wc(e) {
    const t = {};
    return (
      e.forEach((n) => {
        const { name: r } = n,
          s = t[r];
        (s && !s.isDefaultInstance && n.isDefaultInstance) || (t[r] = n);
      }),
      Object.values(t)
    );
  }
  function Tc(e) {
    const t = e.defaultIntegrations || [],
      n = e.integrations;
    t.forEach((s) => {
      s.isDefaultInstance = !0;
    });
    let r;
    if (Array.isArray(n)) r = [...t, ...n];
    else if (typeof n == "function") {
      const s = n(t);
      r = Array.isArray(s) ? s : [s];
    } else r = t;
    return wc(r);
  }
  function vc(e, t) {
    const n = {};
    return (
      t.forEach((r) => {
        r && zr(e, r, n);
      }),
      n
    );
  }
  function qr(e, t) {
    for (const n of t) n != null && n.afterAllSetup && n.afterAllSetup(e);
  }
  function zr(e, t, n) {
    if (n[t.name]) {
      S &&
        _.log(
          `Integration skipped because it was already installed: ${t.name}`,
        );
      return;
    }
    if (
      ((n[t.name] = t),
      Hr.indexOf(t.name) === -1 &&
        typeof t.setupOnce == "function" &&
        (t.setupOnce(), Hr.push(t.name)),
      t.setup && typeof t.setup == "function" && t.setup(e),
      typeof t.preprocessEvent == "function")
    ) {
      const r = t.preprocessEvent.bind(t);
      e.on("preprocessEvent", (s, o) => r(s, o, e));
    }
    if (typeof t.processEvent == "function") {
      const r = t.processEvent.bind(t),
        s = Object.assign((o, i) => r(o, i, e), { id: t.name });
      e.addEventProcessor(s);
    }
    S && _.log(`Integration installed: ${t.name}`);
  }
  function Wl(e) {
    return e;
  }
  function Vr(e) {
    const t = [];
    e.message && t.push(e.message);
    try {
      const n = e.exception.values[e.exception.values.length - 1];
      n != null &&
        n.value &&
        (t.push(n.value), n.type && t.push(`${n.type}: ${n.value}`));
    } catch {}
    return t;
  }
  function Ac(e) {
    var c;
    const {
      trace_id: t,
      parent_span_id: n,
      span_id: r,
      status: s,
      origin: o,
      data: i,
      op: a,
    } = ((c = e.contexts) == null ? void 0 : c.trace) ?? {};
    return {
      data: i ?? {},
      description: e.transaction,
      op: a,
      parent_span_id: n,
      span_id: r ?? "",
      start_timestamp: e.start_timestamp ?? 0,
      status: s,
      timestamp: e.timestamp,
      trace_id: t ?? "",
      origin: o,
      profile_id: i == null ? void 0 : i[pr],
      exclusive_time: i == null ? void 0 : i[hr],
      measurements: e.measurements,
      is_segment: !0,
    };
  }
  function Rc(e) {
    return {
      type: "transaction",
      timestamp: e.timestamp,
      start_timestamp: e.start_timestamp,
      transaction: e.description,
      contexts: {
        trace: {
          trace_id: e.trace_id,
          span_id: e.span_id,
          parent_span_id: e.parent_span_id,
          op: e.op,
          status: e.status,
          origin: e.origin,
          data: {
            ...e.data,
            ...(e.profile_id && { [pr]: e.profile_id }),
            ...(e.exclusive_time && { [hr]: e.exclusive_time }),
          },
        },
      },
      measurements: e.measurements,
    };
  }
  function Cc(e, t, n) {
    const r = [
      { type: "client_report" },
      { timestamp: ve(), discarded_events: e },
    ];
    return Ce(t ? { dsn: t } : {}, [r]);
  }
  const Gr = "Not capturing exception because it's already been captured.",
    Wr = "Discarded session because of missing or non-string release",
    Kr = Symbol.for("SentryInternalError"),
    Jr = Symbol.for("SentryDoNotSendEventError");
  function ot(e) {
    return { message: e, [Kr]: !0 };
  }
  function zt(e) {
    return { message: e, [Jr]: !0 };
  }
  function Yr(e) {
    return !!e && typeof e == "object" && Kr in e;
  }
  function Xr(e) {
    return !!e && typeof e == "object" && Jr in e;
  }
  class Ic {
    constructor(t) {
      if (
        ((this._options = t),
        (this._integrations = {}),
        (this._numProcessing = 0),
        (this._outcomes = {}),
        (this._hooks = {}),
        (this._eventProcessors = []),
        t.dsn
          ? (this._dsn = ja(t.dsn))
          : S && _.warn("No DSN provided, client will not send events."),
        this._dsn)
      ) {
        const n = bc(
          this._dsn,
          t.tunnel,
          t._metadata ? t._metadata.sdk : void 0,
        );
        this._transport = t.transport({
          tunnel: this._options.tunnel,
          recordDroppedEvent: this.recordDroppedEvent.bind(this),
          ...t.transportOptions,
          url: n,
        });
      }
    }
    captureException(t, n, r) {
      const s = M();
      if (ir(t)) return (S && _.log(Gr), s);
      const o = { event_id: s, ...n };
      return (
        this._process(
          this.eventFromException(t, o).then((i) =>
            this._captureEvent(i, o, r),
          ),
        ),
        o.event_id
      );
    }
    captureMessage(t, n, r, s) {
      const o = { event_id: M(), ...r },
        i = Ct(t) ? t : String(t),
        a = It(t)
          ? this.eventFromMessage(i, n, o)
          : this.eventFromException(t, o);
      return (
        this._process(a.then((c) => this._captureEvent(c, o, s))),
        o.event_id
      );
    }
    captureEvent(t, n, r) {
      const s = M();
      if (n != null && n.originalException && ir(n.originalException))
        return (S && _.log(Gr), s);
      const o = { event_id: s, ...n },
        i = t.sdkProcessingMetadata || {},
        a = i.capturedSpanScope,
        c = i.capturedSpanIsolationScope;
      return (this._process(this._captureEvent(t, o, a || r, c)), o.event_id);
    }
    captureSession(t) {
      (this.sendSession(t), ge(t, { init: !1 }));
    }
    getDsn() {
      return this._dsn;
    }
    getOptions() {
      return this._options;
    }
    getSdkMetadata() {
      return this._options._metadata;
    }
    getTransport() {
      return this._transport;
    }
    flush(t) {
      const n = this._transport;
      return n
        ? (this.emit("flush"),
          this._isClientDoneProcessing(t).then((r) =>
            n.flush(t).then((s) => r && s),
          ))
        : ae(!0);
    }
    close(t) {
      return this.flush(t).then(
        (n) => ((this.getOptions().enabled = !1), this.emit("close"), n),
      );
    }
    getEventProcessors() {
      return this._eventProcessors;
    }
    addEventProcessor(t) {
      this._eventProcessors.push(t);
    }
    init() {
      (this._isEnabled() ||
        this._options.integrations.some(({ name: t }) =>
          t.startsWith("Spotlight"),
        )) &&
        this._setupIntegrations();
    }
    getIntegrationByName(t) {
      return this._integrations[t];
    }
    addIntegration(t) {
      const n = this._integrations[t.name];
      (zr(this, t, this._integrations), n || qr(this, [t]));
    }
    sendEvent(t, n = {}) {
      this.emit("beforeSendEvent", t, n);
      let r = tc(t, this._dsn, this._options._metadata, this._options.tunnel);
      for (const o of n.attachments || []) r = Wa(r, Ya(o));
      const s = this.sendEnvelope(r);
      s && s.then((o) => this.emit("afterSendEvent", t, o), null);
    }
    sendSession(t) {
      const { release: n, environment: r = $t } = this._options;
      if ("aggregates" in t) {
        const o = t.attrs || {};
        if (!o.release && !n) {
          S && _.warn(Wr);
          return;
        }
        ((o.release = o.release || n),
          (o.environment = o.environment || r),
          (t.attrs = o));
      } else {
        if (!t.release && !n) {
          S && _.warn(Wr);
          return;
        }
        ((t.release = t.release || n), (t.environment = t.environment || r));
      }
      this.emit("beforeSendSession", t);
      const s = ec(t, this._dsn, this._options._metadata, this._options.tunnel);
      this.sendEnvelope(s);
    }
    recordDroppedEvent(t, n, r = 1) {
      if (this._options.sendClientReports) {
        const s = `${t}:${n}`;
        (S && _.log(`Recording outcome: "${s}"${r > 1 ? ` (${r} times)` : ""}`),
          (this._outcomes[s] = (this._outcomes[s] || 0) + r));
      }
    }
    on(t, n) {
      const r = (this._hooks[t] = this._hooks[t] || []);
      return (
        r.push(n),
        () => {
          const s = r.indexOf(n);
          s > -1 && r.splice(s, 1);
        }
      );
    }
    emit(t, ...n) {
      const r = this._hooks[t];
      r && r.forEach((s) => s(...n));
    }
    sendEnvelope(t) {
      return (
        this.emit("beforeEnvelope", t),
        this._isEnabled() && this._transport
          ? this._transport
              .send(t)
              .then(
                null,
                (n) => (S && _.error("Error while sending envelope:", n), n),
              )
          : (S && _.error("Transport disabled"), ae({}))
      );
    }
    _setupIntegrations() {
      const { integrations: t } = this._options;
      ((this._integrations = vc(this, t)), qr(this, t));
    }
    _updateSessionFromEvent(t, n) {
      var c;
      let r = n.level === "fatal",
        s = !1;
      const o = (c = n.exception) == null ? void 0 : c.values;
      if (o) {
        s = !0;
        for (const u of o) {
          const l = u.mechanism;
          if ((l == null ? void 0 : l.handled) === !1) {
            r = !0;
            break;
          }
        }
      }
      const i = t.status === "ok";
      ((i && t.errors === 0) || (i && r)) &&
        (ge(t, {
          ...(r && { status: "crashed" }),
          errors: t.errors || Number(s || r),
        }),
        this.captureSession(t));
    }
    _isClientDoneProcessing(t) {
      return new J((n) => {
        let r = 0;
        const s = 1,
          o = setInterval(() => {
            this._numProcessing == 0
              ? (clearInterval(o), n(!0))
              : ((r += s), t && r >= t && (clearInterval(o), n(!1)));
          }, s);
      });
    }
    _isEnabled() {
      return this.getOptions().enabled !== !1 && this._transport !== void 0;
    }
    _prepareEvent(t, n, r, s) {
      const o = this.getOptions(),
        i = Object.keys(this._integrations);
      return (
        !n.integrations && i != null && i.length && (n.integrations = i),
        this.emit("preprocessEvent", t, n),
        t.type || s.setLastEventId(t.event_id || n.event_id),
        uc(o, t, n, r, this, s).then((a) => {
          if (a === null) return a;
          (this.emit("postprocessEvent", a, n),
            (a.contexts = { trace: oa(r), ...a.contexts }));
          const c = La(this, r);
          return (
            (a.sdkProcessingMetadata = {
              dynamicSamplingContext: c,
              ...a.sdkProcessingMetadata,
            }),
            a
          );
        })
      );
    }
    _captureEvent(t, n = {}, r = W(), s = Re()) {
      return (
        S &&
          Vt(t) &&
          _.log(`Captured error event \`${Vr(t)[0] || "<unknown>"}\``),
        this._processEvent(t, n, r, s).then(
          (o) => o.event_id,
          (o) => {
            S &&
              (Xr(o)
                ? _.log(o.message)
                : Yr(o)
                  ? _.warn(o.message)
                  : _.warn(o));
          },
        )
      );
    }
    _processEvent(t, n, r, s) {
      const o = this.getOptions(),
        { sampleRate: i } = o,
        a = Qr(t),
        c = Vt(t),
        u = t.type || "error",
        l = `before send for type \`${u}\``,
        f = typeof i > "u" ? void 0 : ma(i);
      if (c && typeof f == "number" && Math.random() > f)
        return (
          this.recordDroppedEvent("sample_rate", "error"),
          tt(
            zt(
              `Discarding event because it's not included in the random sample (sampling rate = ${i})`,
            ),
          )
        );
      const m = u === "replay_event" ? "replay" : u;
      return this._prepareEvent(t, n, r, s)
        .then((p) => {
          if (p === null)
            throw (
              this.recordDroppedEvent("event_processor", m),
              zt("An event processor returned `null`, will not send event.")
            );
          if (n.data && n.data.__sentry__ === !0) return p;
          const y = Oc(this, o, p, n);
          return Pc(y, l);
        })
        .then((p) => {
          var g;
          if (p === null) {
            if ((this.recordDroppedEvent("before_send", m), a)) {
              const v = 1 + (t.spans || []).length;
              this.recordDroppedEvent("before_send", "span", v);
            }
            throw zt(`${l} returned \`null\`, will not send event.`);
          }
          const h = r.getSession() || s.getSession();
          if ((c && h && this._updateSessionFromEvent(h, p), a)) {
            const w =
                ((g = p.sdkProcessingMetadata) == null
                  ? void 0
                  : g.spanCountBeforeProcessing) || 0,
              v = p.spans ? p.spans.length : 0,
              R = w - v;
            R > 0 && this.recordDroppedEvent("before_send", "span", R);
          }
          const y = p.transaction_info;
          if (a && y && p.transaction !== t.transaction) {
            const w = "custom";
            p.transaction_info = { ...y, source: w };
          }
          return (this.sendEvent(p, n), p);
        })
        .then(null, (p) => {
          throw Xr(p) || Yr(p)
            ? p
            : (this.captureException(p, {
                data: { __sentry__: !0 },
                originalException: p,
              }),
              ot(`Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${p}`));
        });
    }
    _process(t) {
      (this._numProcessing++,
        t.then(
          (n) => (this._numProcessing--, n),
          (n) => (this._numProcessing--, n),
        ));
    }
    _clearOutcomes() {
      const t = this._outcomes;
      return (
        (this._outcomes = {}),
        Object.entries(t).map(([n, r]) => {
          const [s, o] = n.split(":");
          return { reason: s, category: o, quantity: r };
        })
      );
    }
    _flushOutcomes() {
      S && _.log("Flushing outcomes...");
      const t = this._clearOutcomes();
      if (t.length === 0) {
        S && _.log("No outcomes to send");
        return;
      }
      if (!this._dsn) {
        S && _.log("No dsn provided, will not send outcomes");
        return;
      }
      S && _.log("Sending outcomes:", t);
      const n = Cc(t, this._options.tunnel && et(this._dsn));
      this.sendEnvelope(n);
    }
  }
  function Pc(e, t) {
    const n = `${t} must return \`null\` or a valid event.`;
    if (Ke(e))
      return e.then(
        (r) => {
          if (!Te(r) && r !== null) throw ot(n);
          return r;
        },
        (r) => {
          throw ot(`${t} rejected with ${r}`);
        },
      );
    if (!Te(e) && e !== null) throw ot(n);
    return e;
  }
  function Oc(e, t, n, r) {
    const { beforeSend: s, beforeSendTransaction: o, beforeSendSpan: i } = t;
    let a = n;
    if (Vt(a) && s) return s(a, r);
    if (Qr(a)) {
      if (i) {
        const c = i(Ac(a));
        if ((c ? (a = Ae(n, Rc(c))) : wr(), a.spans)) {
          const u = [];
          for (const l of a.spans) {
            const f = i(l);
            f ? u.push(f) : (wr(), u.push(l));
          }
          a.spans = u;
        }
      }
      if (o) {
        if (a.spans) {
          const c = a.spans.length;
          a.sdkProcessingMetadata = {
            ...n.sdkProcessingMetadata,
            spanCountBeforeProcessing: c,
          };
        }
        return o(a, r);
      }
    }
    return a;
  }
  function Vt(e) {
    return e.type === void 0;
  }
  function Qr(e) {
    return e.type === "transaction";
  }
  function xc(e) {
    return [
      {
        type: "log",
        item_count: e.length,
        content_type: "application/vnd.sentry.items.log+json",
      },
      { items: e },
    ];
  }
  function Dc(e, t, n, r) {
    const s = {};
    return (
      t != null &&
        t.sdk &&
        (s.sdk = { name: t.sdk.name, version: t.sdk.version }),
      n && r && (s.dsn = et(r)),
      Ce(s, [xc(e)])
    );
  }
  b._sentryClientToLogBufferMap = new WeakMap();
  function Gt(e, t) {
    var o;
    const n = kc(e) ?? [];
    if (n.length === 0) return;
    const r = e.getOptions(),
      s = Dc(n, r._metadata, r.tunnel, e.getDsn());
    ((o = b._sentryClientToLogBufferMap) == null || o.set(e, []),
      e.emit("flushLogs"),
      e.sendEnvelope(s));
  }
  function kc(e) {
    var t;
    return (t = b._sentryClientToLogBufferMap) == null ? void 0 : t.get(e);
  }
  function Nc(e, t) {
    (t.debug === !0 &&
      (S
        ? _.enable()
        : he(() => {
            console.warn(
              "[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.",
            );
          })),
      W().update(t.initialScope));
    const r = new e(t);
    return (Lc(r), r.init(), r);
  }
  function Lc(e) {
    W().setClient(e);
  }
  const Zr = Symbol.for("SentryBufferFullError");
  function Mc(e) {
    const t = [];
    function n() {
      return e === void 0 || t.length < e;
    }
    function r(i) {
      return t.splice(t.indexOf(i), 1)[0] || Promise.resolve(void 0);
    }
    function s(i) {
      if (!n()) return tt(Zr);
      const a = i();
      return (
        t.indexOf(a) === -1 && t.push(a),
        a.then(() => r(a)).then(null, () => r(a).then(null, () => {})),
        a
      );
    }
    function o(i) {
      return new J((a, c) => {
        let u = t.length;
        if (!u) return a(!0);
        const l = setTimeout(() => {
          i && i > 0 && a(!1);
        }, i);
        t.forEach((f) => {
          ae(f).then(() => {
            --u || (clearTimeout(l), a(!0));
          }, c);
        });
      });
    }
    return { $: t, add: s, drain: o };
  }
  const Fc = 60 * 1e3;
  function Bc(e, t = Date.now()) {
    const n = parseInt(`${e}`, 10);
    if (!isNaN(n)) return n * 1e3;
    const r = Date.parse(`${e}`);
    return isNaN(r) ? Fc : r - t;
  }
  function Uc(e, t) {
    return e[t] || e.all || 0;
  }
  function $c(e, t, n = Date.now()) {
    return Uc(e, t) > n;
  }
  function jc(e, { statusCode: t, headers: n }, r = Date.now()) {
    const s = { ...e },
      o = n == null ? void 0 : n["x-sentry-rate-limits"],
      i = n == null ? void 0 : n["retry-after"];
    if (o)
      for (const a of o.trim().split(",")) {
        const [c, u, , , l] = a.split(":", 5),
          f = parseInt(c, 10),
          m = (isNaN(f) ? 60 : f) * 1e3;
        if (!u) s.all = r + m;
        else
          for (const p of u.split(";"))
            p === "metric_bucket"
              ? (!l || l.split(";").includes("custom")) && (s[p] = r + m)
              : (s[p] = r + m);
      }
    else i ? (s.all = r + Bc(i, r)) : t === 429 && (s.all = r + 60 * 1e3);
    return s;
  }
  const Hc = 64;
  function qc(e, t, n = Mc(e.bufferSize || Hc)) {
    let r = {};
    const s = (i) => n.drain(i);
    function o(i) {
      const a = [];
      if (
        (Dr(i, (f, m) => {
          const p = kr(m);
          $c(r, p) ? e.recordDroppedEvent("ratelimit_backoff", p) : a.push(f);
        }),
        a.length === 0)
      )
        return ae({});
      const c = Ce(i[0], a),
        u = (f) => {
          Dr(c, (m, p) => {
            e.recordDroppedEvent(f, kr(p));
          });
        },
        l = () =>
          t({ body: Ka(c) }).then(
            (f) => (
              f.statusCode !== void 0 &&
                (f.statusCode < 200 || f.statusCode >= 300) &&
                S &&
                _.warn(
                  `Sentry responded with status code ${f.statusCode} to sent event.`,
                ),
              (r = jc(r, f)),
              f
            ),
            (f) => {
              throw (
                u("network_error"),
                S && _.error("Encountered error running transport request:", f),
                f
              );
            },
          );
      return n.add(l).then(
        (f) => f,
        (f) => {
          if (f === Zr)
            return (
              S && _.error("Skipped sending event because buffer is full."),
              u("queue_overflow"),
              ae({})
            );
          throw f;
        },
      );
    }
    return { send: o, flush: s };
  }
  function zc(e) {
    var t;
    ((t = e.user) == null ? void 0 : t.ip_address) === void 0 &&
      (e.user = { ...e.user, ip_address: "{{auto}}" });
  }
  function Vc(e) {
    var t;
    "aggregates" in e
      ? ((t = e.attrs) == null ? void 0 : t.ip_address) === void 0 &&
        (e.attrs = { ...e.attrs, ip_address: "{{auto}}" })
      : e.ipAddress === void 0 && (e.ipAddress = "{{auto}}");
  }
  function Gc(e, t, n = [t], r = "npm") {
    const s = e._metadata || {};
    (s.sdk ||
      (s.sdk = {
        name: `sentry.javascript.${t}`,
        packages: n.map((o) => ({ name: `${r}:@sentry/${o}`, version: te })),
        version: te,
      }),
      (e._metadata = s));
  }
  const Wc = 100;
  function ce(e, t) {
    const n = O(),
      r = Re();
    if (!n) return;
    const { beforeBreadcrumb: s = null, maxBreadcrumbs: o = Wc } =
      n.getOptions();
    if (o <= 0) return;
    const a = { timestamp: ve(), ...e },
      c = s ? he(() => s(a, t)) : a;
    c !== null &&
      (n.emit && n.emit("beforeAddBreadcrumb", c, t), r.addBreadcrumb(c, o));
  }
  let es;
  const Kc = "FunctionToString",
    ts = new WeakMap(),
    Jc = () => ({
      name: Kc,
      setupOnce() {
        es = Function.prototype.toString;
        try {
          Function.prototype.toString = function (...e) {
            const t = Dt(this),
              n = ts.has(O()) && t !== void 0 ? t : this;
            return es.apply(n, e);
          };
        } catch {}
      },
      setup(e) {
        ts.set(e, !0);
      },
    }),
    Yc = [
      /^Script error\.?$/,
      /^Javascript error: Script error\.? on line 0$/,
      /^ResizeObserver loop completed with undelivered notifications.$/,
      /^Cannot redefine property: googletag$/,
      /^Can't find variable: gmo$/,
      /^undefined is not an object \(evaluating 'a\.[A-Z]'\)$/,
      `can't redefine non-configurable property "solana"`,
      "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)",
      "Can't find variable: _AutofillCallbackHandler",
      /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:simulateEvent, ParamCount:\d+$/,
      /^Java exception was raised during method invocation$/,
    ],
    Xc = "EventFilters",
    Qc = (e = {}) => {
      let t;
      return {
        name: Xc,
        setup(n) {
          const r = n.getOptions();
          t = ns(e, r);
        },
        processEvent(n, r, s) {
          if (!t) {
            const o = s.getOptions();
            t = ns(e, o);
          }
          return eu(n, t) ? null : n;
        },
      };
    },
    Zc = (e = {}) => ({ ...Qc(e), name: "InboundFilters" });
  function ns(e = {}, t = {}) {
    return {
      allowUrls: [...(e.allowUrls || []), ...(t.allowUrls || [])],
      denyUrls: [...(e.denyUrls || []), ...(t.denyUrls || [])],
      ignoreErrors: [
        ...(e.ignoreErrors || []),
        ...(t.ignoreErrors || []),
        ...(e.disableErrorDefaults ? [] : Yc),
      ],
      ignoreTransactions: [
        ...(e.ignoreTransactions || []),
        ...(t.ignoreTransactions || []),
      ],
    };
  }
  function eu(e, t) {
    if (e.type) {
      if (e.type === "transaction" && nu(e, t.ignoreTransactions))
        return (
          S &&
            _.warn(`Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${re(e)}`),
          !0
        );
    } else {
      if (tu(e, t.ignoreErrors))
        return (
          S &&
            _.warn(`Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${re(e)}`),
          !0
        );
      if (iu(e))
        return (
          S &&
            _.warn(`Event dropped due to not having an error message, error type or stacktrace.
Event: ${re(e)}`),
          !0
        );
      if (ru(e, t.denyUrls))
        return (
          S &&
            _.warn(`Event dropped due to being matched by \`denyUrls\` option.
Event: ${re(e)}.
Url: ${it(e)}`),
          !0
        );
      if (!su(e, t.allowUrls))
        return (
          S &&
            _.warn(`Event dropped due to not being matched by \`allowUrls\` option.
Event: ${re(e)}.
Url: ${it(e)}`),
          !0
        );
    }
    return !1;
  }
  function tu(e, t) {
    return t != null && t.length ? Vr(e).some((n) => Xe(n, t)) : !1;
  }
  function nu(e, t) {
    if (!(t != null && t.length)) return !1;
    const n = e.transaction;
    return n ? Xe(n, t) : !1;
  }
  function ru(e, t) {
    if (!(t != null && t.length)) return !1;
    const n = it(e);
    return n ? Xe(n, t) : !1;
  }
  function su(e, t) {
    if (!(t != null && t.length)) return !0;
    const n = it(e);
    return n ? Xe(n, t) : !0;
  }
  function ou(e = []) {
    for (let t = e.length - 1; t >= 0; t--) {
      const n = e[t];
      if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
        return n.filename || null;
    }
    return null;
  }
  function it(e) {
    var t, n;
    try {
      const r = [...(((t = e.exception) == null ? void 0 : t.values) ?? [])]
          .reverse()
          .find((o) => {
            var i, a, c;
            return (
              ((i = o.mechanism) == null ? void 0 : i.parent_id) === void 0 &&
              ((c = (a = o.stacktrace) == null ? void 0 : a.frames) == null
                ? void 0
                : c.length)
            );
          }),
        s = (n = r == null ? void 0 : r.stacktrace) == null ? void 0 : n.frames;
      return s ? ou(s) : null;
    } catch {
      return (S && _.error(`Cannot extract url for event ${re(e)}`), null);
    }
  }
  function iu(e) {
    var t, n;
    return (n = (t = e.exception) == null ? void 0 : t.values) != null &&
      n.length
      ? !e.message &&
          !e.exception.values.some(
            (r) => r.stacktrace || (r.type && r.type !== "Error") || r.value,
          )
      : !1;
  }
  function au(e, t, n, r, s, o) {
    var a;
    if (
      !((a = s.exception) != null && a.values) ||
      !o ||
      !G(o.originalException, Error)
    )
      return;
    const i =
      s.exception.values.length > 0
        ? s.exception.values[s.exception.values.length - 1]
        : void 0;
    i &&
      (s.exception.values = Wt(
        e,
        t,
        r,
        o.originalException,
        n,
        s.exception.values,
        i,
        0,
      ));
  }
  function Wt(e, t, n, r, s, o, i, a) {
    if (o.length >= n + 1) return o;
    let c = [...o];
    if (G(r[s], Error)) {
      rs(i, a);
      const u = e(t, r[s]),
        l = c.length;
      (ss(u, s, l, a), (c = Wt(e, t, n, r[s], s, [u, ...c], u, l)));
    }
    return (
      Array.isArray(r.errors) &&
        r.errors.forEach((u, l) => {
          if (G(u, Error)) {
            rs(i, a);
            const f = e(t, u),
              m = c.length;
            (ss(f, `errors[${l}]`, m, a),
              (c = Wt(e, t, n, u, s, [f, ...c], f, m)));
          }
        }),
      c
    );
  }
  function rs(e, t) {
    ((e.mechanism = e.mechanism || { type: "generic", handled: !0 }),
      (e.mechanism = {
        ...e.mechanism,
        ...(e.type === "AggregateError" && { is_exception_group: !0 }),
        exception_id: t,
      }));
  }
  function ss(e, t, n, r) {
    ((e.mechanism = e.mechanism || { type: "generic", handled: !0 }),
      (e.mechanism = {
        ...e.mechanism,
        type: "chained",
        source: t,
        exception_id: n,
        parent_id: r,
      }));
  }
  function cu(e) {
    const t = "console";
    (oe(t, e), ie(t, uu));
  }
  function uu() {
    "console" in b &&
      xt.forEach(function (e) {
        e in b.console &&
          L(b.console, e, function (t) {
            return (
              (Je[e] = t),
              function (...n) {
                B("console", { args: n, level: e });
                const s = Je[e];
                s == null || s.apply(b.console, n);
              }
            );
          });
      });
  }
  function lu(e) {
    return e === "warn"
      ? "warning"
      : ["fatal", "error", "warning", "log", "info", "debug"].includes(e)
        ? e
        : "log";
  }
  const du = "Dedupe",
    fu = () => {
      let e;
      return {
        name: du,
        processEvent(t) {
          if (t.type) return t;
          try {
            if (pu(t, e))
              return (
                S &&
                  _.warn(
                    "Event dropped due to being a duplicate of previously captured event.",
                  ),
                null
              );
          } catch {}
          return (e = t);
        },
      };
    };
  function pu(e, t) {
    return t ? !!(hu(e, t) || mu(e, t)) : !1;
  }
  function hu(e, t) {
    const n = e.message,
      r = t.message;
    return !(
      (!n && !r) ||
      (n && !r) ||
      (!n && r) ||
      n !== r ||
      !is(e, t) ||
      !os(e, t)
    );
  }
  function mu(e, t) {
    const n = as(t),
      r = as(e);
    return !(
      !n ||
      !r ||
      n.type !== r.type ||
      n.value !== r.value ||
      !is(e, t) ||
      !os(e, t)
    );
  }
  function os(e, t) {
    let n = Cr(e),
      r = Cr(t);
    if (!n && !r) return !0;
    if ((n && !r) || (!n && r) || ((n = n), (r = r), r.length !== n.length))
      return !1;
    for (let s = 0; s < r.length; s++) {
      const o = r[s],
        i = n[s];
      if (
        o.filename !== i.filename ||
        o.lineno !== i.lineno ||
        o.colno !== i.colno ||
        o.function !== i.function
      )
        return !1;
    }
    return !0;
  }
  function is(e, t) {
    let n = e.fingerprint,
      r = t.fingerprint;
    if (!n && !r) return !0;
    if ((n && !r) || (!n && r)) return !1;
    ((n = n), (r = r));
    try {
      return n.join("") === r.join("");
    } catch {
      return !1;
    }
  }
  function as(e) {
    var t;
    return (
      ((t = e.exception) == null ? void 0 : t.values) && e.exception.values[0]
    );
  }
  function Kt(e) {
    if (!e) return {};
    const t = e.match(
      /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/,
    );
    if (!t) return {};
    const n = t[6] || "",
      r = t[8] || "";
    return {
      host: t[4],
      path: t[5],
      protocol: t[2],
      search: n,
      hash: r,
      relative: t[5] + n + r,
    };
  }
  function cs(e) {
    if (e !== void 0)
      return e >= 400 && e < 500 ? "warning" : e >= 500 ? "error" : void 0;
  }
  const Ie = b;
  function gu() {
    return "history" in Ie && !!Ie.history;
  }
  function us() {
    if (!("fetch" in Ie)) return !1;
    try {
      return (
        new Headers(),
        new Request("http://www.example.com"),
        new Response(),
        !0
      );
    } catch {
      return !1;
    }
  }
  function Jt(e) {
    return (
      e && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString())
    );
  }
  function yu() {
    var n;
    if (typeof EdgeRuntime == "string") return !0;
    if (!us()) return !1;
    if (Jt(Ie.fetch)) return !0;
    let e = !1;
    const t = Ie.document;
    if (t && typeof t.createElement == "function")
      try {
        const r = t.createElement("iframe");
        ((r.hidden = !0),
          t.head.appendChild(r),
          (n = r.contentWindow) != null &&
            n.fetch &&
            (e = Jt(r.contentWindow.fetch)),
          t.head.removeChild(r));
      } catch (r) {
        S &&
          _.warn(
            "Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ",
            r,
          );
      }
    return e;
  }
  function _u(e, t) {
    const n = "fetch";
    (oe(n, e), ie(n, () => Eu(void 0, t)));
  }
  function Eu(e, t = !1) {
    (t && !yu()) ||
      L(b, "fetch", function (n) {
        return function (...r) {
          const s = new Error(),
            { method: o, url: i } = Su(r),
            a = {
              args: r,
              fetchData: { method: o, url: i },
              startTimestamp: j() * 1e3,
              virtualError: s,
              headers: bu(r),
            };
          return (
            B("fetch", { ...a }),
            n.apply(b, r).then(
              async (c) => (
                B("fetch", { ...a, endTimestamp: j() * 1e3, response: c }),
                c
              ),
              (c) => {
                if (
                  (B("fetch", { ...a, endTimestamp: j() * 1e3, error: c }),
                  Rt(c) &&
                    c.stack === void 0 &&
                    ((c.stack = s.stack), ne(c, "framesToPop", 1)),
                  c instanceof TypeError &&
                    (c.message === "Failed to fetch" ||
                      c.message === "Load failed" ||
                      c.message ===
                        "NetworkError when attempting to fetch resource."))
                )
                  try {
                    const u = new URL(a.fetchData.url);
                    c.message = `${c.message} (${u.host})`;
                  } catch {}
                throw c;
              },
            )
          );
        };
      });
  }
  function Yt(e, t) {
    return !!e && typeof e == "object" && !!e[t];
  }
  function ls(e) {
    return typeof e == "string"
      ? e
      : e
        ? Yt(e, "url")
          ? e.url
          : e.toString
            ? e.toString()
            : ""
        : "";
  }
  function Su(e) {
    if (e.length === 0) return { method: "GET", url: "" };
    if (e.length === 2) {
      const [n, r] = e;
      return {
        url: ls(n),
        method: Yt(r, "method") ? String(r.method).toUpperCase() : "GET",
      };
    }
    const t = e[0];
    return {
      url: ls(t),
      method: Yt(t, "method") ? String(t.method).toUpperCase() : "GET",
    };
  }
  function bu(e) {
    const [t, n] = e;
    try {
      if (typeof n == "object" && n !== null && "headers" in n && n.headers)
        return new Headers(n.headers);
      if (Mi(t)) return new Headers(t.headers);
    } catch {}
  }
  function wu() {
    return "npm";
  }
  const A = b;
  let Xt = 0;
  function ds() {
    return Xt > 0;
  }
  function Tu() {
    (Xt++,
      setTimeout(() => {
        Xt--;
      }));
  }
  function _e(e, t = {}) {
    function n(s) {
      return typeof s == "function";
    }
    if (!n(e)) return e;
    try {
      const s = e.__sentry_wrapped__;
      if (s) return typeof s == "function" ? s : e;
      if (Dt(e)) return e;
    } catch {
      return e;
    }
    const r = function (...s) {
      try {
        const o = s.map((i) => _e(i, t));
        return e.apply(this, o);
      } catch (o) {
        throw (
          Tu(),
          sa((i) => {
            (i.addEventProcessor(
              (a) => (
                t.mechanism && (kt(a, void 0), me(a, t.mechanism)),
                (a.extra = { ...a.extra, arguments: s }),
                a
              ),
            ),
              gc(o));
          }),
          o
        );
      }
    };
    try {
      for (const s in e)
        Object.prototype.hasOwnProperty.call(e, s) && (r[s] = e[s]);
    } catch {}
    (tr(r, e), ne(e, "__sentry_wrapped__", r));
    try {
      Object.getOwnPropertyDescriptor(r, "name").configurable &&
        Object.defineProperty(r, "name", {
          get() {
            return e.name;
          },
        });
    } catch {}
    return r;
  }
  function Qt(e, t) {
    const n = en(e, t),
      r = { type: Iu(t), value: Pu(t) };
    return (
      n.length && (r.stacktrace = { frames: n }),
      r.type === void 0 &&
        r.value === "" &&
        (r.value = "Unrecoverable error caught"),
      r
    );
  }
  function vu(e, t, n, r) {
    const s = O(),
      o = s == null ? void 0 : s.getOptions().normalizeDepth,
      i = Nu(t),
      a = { __serialized__: xr(t, o) };
    if (i) return { exception: { values: [Qt(e, i)] }, extra: a };
    const c = {
      exception: {
        values: [
          {
            type: We(t)
              ? t.constructor.name
              : r
                ? "UnhandledRejection"
                : "Error",
            value: Du(t, { isUnhandledRejection: r }),
          },
        ],
      },
      extra: a,
    };
    if (n) {
      const u = en(e, n);
      u.length && (c.exception.values[0].stacktrace = { frames: u });
    }
    return c;
  }
  function Zt(e, t) {
    return { exception: { values: [Qt(e, t)] } };
  }
  function en(e, t) {
    const n = t.stacktrace || t.stack || "",
      r = Ru(t),
      s = Cu(t);
    try {
      return e(n, r, s);
    } catch {}
    return [];
  }
  const Au = /Minified React error #\d+;/i;
  function Ru(e) {
    return e && Au.test(e.message) ? 1 : 0;
  }
  function Cu(e) {
    return typeof e.framesToPop == "number" ? e.framesToPop : 0;
  }
  function fs(e) {
    return typeof WebAssembly < "u" && typeof WebAssembly.Exception < "u"
      ? e instanceof WebAssembly.Exception
      : !1;
  }
  function Iu(e) {
    const t = e == null ? void 0 : e.name;
    return !t && fs(e)
      ? e.message && Array.isArray(e.message) && e.message.length == 2
        ? e.message[0]
        : "WebAssembly.Exception"
      : t;
  }
  function Pu(e) {
    const t = e == null ? void 0 : e.message;
    return fs(e)
      ? Array.isArray(e.message) && e.message.length == 2
        ? e.message[1]
        : "wasm exception"
      : t
        ? t.error && typeof t.error.message == "string"
          ? t.error.message
          : t
        : "No error message";
  }
  function Ou(e, t, n, r) {
    const s = (n == null ? void 0 : n.syntheticException) || void 0,
      o = tn(e, t, s, r);
    return (
      me(o),
      (o.level = "error"),
      n != null && n.event_id && (o.event_id = n.event_id),
      ae(o)
    );
  }
  function xu(e, t, n = "info", r, s) {
    const o = (r == null ? void 0 : r.syntheticException) || void 0,
      i = nn(e, t, o, s);
    return (
      (i.level = n),
      r != null && r.event_id && (i.event_id = r.event_id),
      ae(i)
    );
  }
  function tn(e, t, n, r, s) {
    let o;
    if (Yn(t) && t.error) return Zt(e, t.error);
    if (Xn(t) || Di(t)) {
      const i = t;
      if ("stack" in t) o = Zt(e, t);
      else {
        const a = i.name || (Xn(i) ? "DOMError" : "DOMException"),
          c = i.message ? `${a}: ${i.message}` : a;
        ((o = nn(e, c, n, r)), kt(o, c));
      }
      return (
        "code" in i &&
          (o.tags = { ...o.tags, "DOMException.code": `${i.code}` }),
        o
      );
    }
    return Rt(t)
      ? Zt(e, t)
      : Te(t) || We(t)
        ? ((o = vu(e, t, n, s)), me(o, { synthetic: !0 }), o)
        : ((o = nn(e, t, n, r)), kt(o, `${t}`), me(o, { synthetic: !0 }), o);
  }
  function nn(e, t, n, r) {
    const s = {};
    if (r && n) {
      const o = en(e, n);
      (o.length &&
        (s.exception = { values: [{ value: t, stacktrace: { frames: o } }] }),
        me(s, { synthetic: !0 }));
    }
    if (Ct(t)) {
      const { __sentry_template_string__: o, __sentry_template_values__: i } =
        t;
      return ((s.logentry = { message: o, params: i }), s);
    }
    return ((s.message = t), s);
  }
  function Du(e, { isUnhandledRejection: t }) {
    const n = qi(e),
      r = t ? "promise rejection" : "exception";
    return Yn(e)
      ? `Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\``
      : We(e)
        ? `Event \`${ku(e)}\` (type=${e.type}) captured as ${r}`
        : `Object captured as ${r} with keys: ${n}`;
  }
  function ku(e) {
    try {
      const t = Object.getPrototypeOf(e);
      return t ? t.constructor.name : void 0;
    } catch {}
  }
  function Nu(e) {
    for (const t in e)
      if (Object.prototype.hasOwnProperty.call(e, t)) {
        const n = e[t];
        if (n instanceof Error) return n;
      }
  }
  const Lu = 5e3;
  class Mu extends Ic {
    constructor(t) {
      const n = { parentSpanIsAlwaysRootSpan: !0, ...t },
        r = A.SENTRY_SDK_SOURCE || wu();
      (Gc(n, "browser", ["browser"], r), super(n));
      const s = this,
        { sendDefaultPii: o, _experiments: i } = s._options,
        a = i == null ? void 0 : i.enableLogs;
      (n.sendClientReports &&
        A.document &&
        A.document.addEventListener("visibilitychange", () => {
          A.document.visibilityState === "hidden" &&
            (this._flushOutcomes(), a && Gt(s));
        }),
        a &&
          (s.on("flush", () => {
            Gt(s);
          }),
          s.on("afterCaptureLog", () => {
            (s._logFlushIdleTimeout && clearTimeout(s._logFlushIdleTimeout),
              (s._logFlushIdleTimeout = setTimeout(() => {
                Gt(s);
              }, Lu)));
          })),
        o && (s.on("postprocessEvent", zc), s.on("beforeSendSession", Vc)));
    }
    eventFromException(t, n) {
      return Ou(
        this._options.stackParser,
        t,
        n,
        this._options.attachStacktrace,
      );
    }
    eventFromMessage(t, n = "info", r) {
      return xu(
        this._options.stackParser,
        t,
        n,
        r,
        this._options.attachStacktrace,
      );
    }
    _prepareEvent(t, n, r, s) {
      return (
        (t.platform = t.platform || "javascript"),
        super._prepareEvent(t, n, r, s)
      );
    }
  }
  const Fu = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__,
    D = b,
    Bu = 1e3;
  let ps, rn, sn;
  function Uu(e) {
    const t = "dom";
    (oe(t, e), ie(t, $u));
  }
  function $u() {
    if (!D.document) return;
    const e = B.bind(null, "dom"),
      t = hs(e, !0);
    (D.document.addEventListener("click", t, !1),
      D.document.addEventListener("keypress", t, !1),
      ["EventTarget", "Node"].forEach((n) => {
        var o, i;
        const s = (o = D[n]) == null ? void 0 : o.prototype;
        (i = s == null ? void 0 : s.hasOwnProperty) != null &&
          i.call(s, "addEventListener") &&
          (L(s, "addEventListener", function (a) {
            return function (c, u, l) {
              if (c === "click" || c == "keypress")
                try {
                  const f = (this.__sentry_instrumentation_handlers__ =
                      this.__sentry_instrumentation_handlers__ || {}),
                    m = (f[c] = f[c] || { refCount: 0 });
                  if (!m.handler) {
                    const p = hs(e);
                    ((m.handler = p), a.call(this, c, p, l));
                  }
                  m.refCount++;
                } catch {}
              return a.call(this, c, u, l);
            };
          }),
          L(s, "removeEventListener", function (a) {
            return function (c, u, l) {
              if (c === "click" || c == "keypress")
                try {
                  const f = this.__sentry_instrumentation_handlers__ || {},
                    m = f[c];
                  m &&
                    (m.refCount--,
                    m.refCount <= 0 &&
                      (a.call(this, c, m.handler, l),
                      (m.handler = void 0),
                      delete f[c]),
                    Object.keys(f).length === 0 &&
                      delete this.__sentry_instrumentation_handlers__);
                } catch {}
              return a.call(this, c, u, l);
            };
          }));
      }));
  }
  function ju(e) {
    if (e.type !== rn) return !1;
    try {
      if (!e.target || e.target._sentryId !== sn) return !1;
    } catch {}
    return !0;
  }
  function Hu(e, t) {
    return e !== "keypress"
      ? !1
      : t != null && t.tagName
        ? !(
            t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable
          )
        : !0;
  }
  function hs(e, t = !1) {
    return (n) => {
      if (!n || n._sentryCaptured) return;
      const r = qu(n);
      if (Hu(n.type, r)) return;
      (ne(n, "_sentryCaptured", !0),
        r && !r._sentryId && ne(r, "_sentryId", M()));
      const s = n.type === "keypress" ? "input" : n.type;
      (ju(n) ||
        (e({ event: n, name: s, global: t }),
        (rn = n.type),
        (sn = r ? r._sentryId : void 0)),
        clearTimeout(ps),
        (ps = D.setTimeout(() => {
          ((sn = void 0), (rn = void 0));
        }, Bu)));
    };
  }
  function qu(e) {
    try {
      return e.target;
    } catch {
      return null;
    }
  }
  let at;
  function ms(e) {
    const t = "history";
    (oe(t, e), ie(t, zu));
  }
  function zu() {
    if (
      (D.addEventListener("popstate", () => {
        const t = D.location.href,
          n = at;
        if (((at = t), n === t)) return;
        B("history", { from: n, to: t });
      }),
      !gu())
    )
      return;
    function e(t) {
      return function (...n) {
        const r = n.length > 2 ? n[2] : void 0;
        if (r) {
          const s = at,
            o = String(r);
          if (((at = o), s === o)) return t.apply(this, n);
          B("history", { from: s, to: o });
        }
        return t.apply(this, n);
      };
    }
    (L(D.history, "pushState", e), L(D.history, "replaceState", e));
  }
  const ct = {};
  function Vu(e) {
    const t = ct[e];
    if (t) return t;
    let n = D[e];
    if (Jt(n)) return (ct[e] = n.bind(D));
    const r = D.document;
    if (r && typeof r.createElement == "function")
      try {
        const s = r.createElement("iframe");
        ((s.hidden = !0), r.head.appendChild(s));
        const o = s.contentWindow;
        (o != null && o[e] && (n = o[e]), r.head.removeChild(s));
      } catch (s) {
        Fu &&
          _.warn(
            `Could not create sandbox iframe for ${e} check, bailing to window.${e}: `,
            s,
          );
      }
    return n && (ct[e] = n.bind(D));
  }
  function gs(e) {
    ct[e] = void 0;
  }
  const Pe = "__sentry_xhr_v3__";
  function Gu(e) {
    const t = "xhr";
    (oe(t, e), ie(t, Wu));
  }
  function Wu() {
    if (!D.XMLHttpRequest) return;
    const e = XMLHttpRequest.prototype;
    ((e.open = new Proxy(e.open, {
      apply(t, n, r) {
        const s = new Error(),
          o = j() * 1e3,
          i = $(r[0]) ? r[0].toUpperCase() : void 0,
          a = Ku(r[1]);
        if (!i || !a) return t.apply(n, r);
        ((n[Pe] = { method: i, url: a, request_headers: {} }),
          i === "POST" &&
            a.match(/sentry_key/) &&
            (n.__sentry_own_request__ = !0));
        const c = () => {
          const u = n[Pe];
          if (u && n.readyState === 4) {
            try {
              u.status_code = n.status;
            } catch {}
            const l = {
              endTimestamp: j() * 1e3,
              startTimestamp: o,
              xhr: n,
              virtualError: s,
            };
            B("xhr", l);
          }
        };
        return (
          "onreadystatechange" in n && typeof n.onreadystatechange == "function"
            ? (n.onreadystatechange = new Proxy(n.onreadystatechange, {
                apply(u, l, f) {
                  return (c(), u.apply(l, f));
                },
              }))
            : n.addEventListener("readystatechange", c),
          (n.setRequestHeader = new Proxy(n.setRequestHeader, {
            apply(u, l, f) {
              const [m, p] = f,
                h = l[Pe];
              return (
                h && $(m) && $(p) && (h.request_headers[m.toLowerCase()] = p),
                u.apply(l, f)
              );
            },
          })),
          t.apply(n, r)
        );
      },
    })),
      (e.send = new Proxy(e.send, {
        apply(t, n, r) {
          const s = n[Pe];
          if (!s) return t.apply(n, r);
          r[0] !== void 0 && (s.body = r[0]);
          const o = { startTimestamp: j() * 1e3, xhr: n };
          return (B("xhr", o), t.apply(n, r));
        },
      })));
  }
  function Ku(e) {
    if ($(e)) return e;
    try {
      return e.toString();
    } catch {}
  }
  function Ju(e, t = Vu("fetch")) {
    let n = 0,
      r = 0;
    function s(o) {
      const i = o.body.length;
      ((n += i), r++);
      const a = {
        body: o.body,
        method: "POST",
        referrerPolicy: "strict-origin",
        headers: e.headers,
        keepalive: n <= 6e4 && r < 15,
        ...e.fetchOptions,
      };
      if (!t) return (gs("fetch"), tt("No fetch implementation available"));
      try {
        return t(e.url, a).then(
          (c) => (
            (n -= i),
            r--,
            {
              statusCode: c.status,
              headers: {
                "x-sentry-rate-limits": c.headers.get("X-Sentry-Rate-Limits"),
                "retry-after": c.headers.get("Retry-After"),
              },
            }
          ),
        );
      } catch (c) {
        return (gs("fetch"), (n -= i), r--, tt(c));
      }
    }
    return qc(e, s);
  }
  const Yu = 30,
    Xu = 50;
  function on(e, t, n, r) {
    const s = {
      filename: e,
      function: t === "<anonymous>" ? se : t,
      in_app: !0,
    };
    return (n !== void 0 && (s.lineno = n), r !== void 0 && (s.colno = r), s);
  }
  const Qu = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i,
    Zu =
      /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i,
    el = /\((\S*)(?::(\d+))(?::(\d+))\)/,
    tl = [
      Yu,
      (e) => {
        const t = Qu.exec(e);
        if (t) {
          const [, r, s, o] = t;
          return on(r, se, +s, +o);
        }
        const n = Zu.exec(e);
        if (n) {
          if (n[2] && n[2].indexOf("eval") === 0) {
            const i = el.exec(n[2]);
            i && ((n[2] = i[1]), (n[3] = i[2]), (n[4] = i[3]));
          }
          const [s, o] = ys(n[1] || se, n[2]);
          return on(o, s, n[3] ? +n[3] : void 0, n[4] ? +n[4] : void 0);
        }
      },
    ],
    nl =
      /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i,
    rl = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i,
    sl = Rr(
      ...[
        tl,
        [
          Xu,
          (e) => {
            const t = nl.exec(e);
            if (t) {
              if (t[3] && t[3].indexOf(" > eval") > -1) {
                const o = rl.exec(t[3]);
                o &&
                  ((t[1] = t[1] || "eval"),
                  (t[3] = o[1]),
                  (t[4] = o[2]),
                  (t[5] = ""));
              }
              let r = t[3],
                s = t[1] || se;
              return (
                ([s, r] = ys(s, r)),
                on(r, s, t[4] ? +t[4] : void 0, t[5] ? +t[5] : void 0)
              );
            }
          },
        ],
      ],
    ),
    ys = (e, t) => {
      const n = e.indexOf("safari-extension") !== -1,
        r = e.indexOf("safari-web-extension") !== -1;
      return n || r
        ? [
            e.indexOf("@") !== -1 ? e.split("@")[0] : se,
            n ? `safari-extension:${t}` : `safari-web-extension:${t}`,
          ]
        : [e, t];
    },
    Oe = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__,
    ut = 1024,
    ol = "Breadcrumbs",
    il = (e = {}) => {
      const t = {
        console: !0,
        dom: !0,
        fetch: !0,
        history: !0,
        sentry: !0,
        xhr: !0,
        ...e,
      };
      return {
        name: ol,
        setup(n) {
          (t.console && cu(ul(n)),
            t.dom && Uu(cl(n, t.dom)),
            t.xhr && Gu(ll(n)),
            t.fetch && _u(dl(n)),
            t.history && ms(fl(n)),
            t.sentry && n.on("beforeSendEvent", al(n)));
        },
      };
    };
  function al(e) {
    return function (n) {
      O() === e &&
        ce(
          {
            category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
            event_id: n.event_id,
            level: n.level,
            message: re(n),
          },
          { event: n },
        );
    };
  }
  function cl(e, t) {
    return function (r) {
      if (O() !== e) return;
      let s,
        o,
        i = typeof t == "object" ? t.serializeAttribute : void 0,
        a =
          typeof t == "object" && typeof t.maxStringLength == "number"
            ? t.maxStringLength
            : void 0;
      (a &&
        a > ut &&
        (Oe &&
          _.warn(
            `\`dom.maxStringLength\` cannot exceed ${ut}, but a value of ${a} was configured. Sentry will use ${ut} instead.`,
          ),
        (a = ut)),
        typeof i == "string" && (i = [i]));
      try {
        const u = r.event,
          l = pl(u) ? u.target : u;
        ((s = Zn(l, { keyAttrs: i, maxStringLength: a })), (o = Ui(l)));
      } catch {
        s = "<unknown>";
      }
      if (s.length === 0) return;
      const c = { category: `ui.${r.name}`, message: s };
      (o && (c.data = { "ui.component_name": o }),
        ce(c, { event: r.event, name: r.name, global: r.global }));
    };
  }
  function ul(e) {
    return function (n) {
      if (O() !== e) return;
      const r = {
        category: "console",
        data: { arguments: n.args, logger: "console" },
        level: lu(n.level),
        message: er(n.args, " "),
      };
      if (n.level === "assert")
        if (n.args[0] === !1)
          ((r.message = `Assertion failed: ${er(n.args.slice(1), " ") || "console.assert"}`),
            (r.data.arguments = n.args.slice(1)));
        else return;
      ce(r, { input: n.args, level: n.level });
    };
  }
  function ll(e) {
    return function (n) {
      if (O() !== e) return;
      const { startTimestamp: r, endTimestamp: s } = n,
        o = n.xhr[Pe];
      if (!r || !s || !o) return;
      const { method: i, url: a, status_code: c, body: u } = o,
        l = { method: i, url: a, status_code: c },
        f = { xhr: n.xhr, input: u, startTimestamp: r, endTimestamp: s },
        m = { category: "xhr", data: l, type: "http", level: cs(c) };
      (e.emit("beforeOutgoingRequestBreadcrumb", m, f), ce(m, f));
    };
  }
  function dl(e) {
    return function (n) {
      if (O() !== e) return;
      const { startTimestamp: r, endTimestamp: s } = n;
      if (
        s &&
        !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST")
      )
        if ((n.fetchData.method, n.fetchData.url, n.error)) {
          const o = n.fetchData,
            i = {
              data: n.error,
              input: n.args,
              startTimestamp: r,
              endTimestamp: s,
            },
            a = { category: "fetch", data: o, level: "error", type: "http" };
          (e.emit("beforeOutgoingRequestBreadcrumb", a, i), ce(a, i));
        } else {
          const o = n.response,
            i = { ...n.fetchData, status_code: o == null ? void 0 : o.status };
          (n.fetchData.request_body_size,
            n.fetchData.response_body_size,
            o == null || o.status);
          const a = {
              input: n.args,
              response: o,
              startTimestamp: r,
              endTimestamp: s,
            },
            c = {
              category: "fetch",
              data: i,
              type: "http",
              level: cs(i.status_code),
            };
          (e.emit("beforeOutgoingRequestBreadcrumb", c, a), ce(c, a));
        }
    };
  }
  function fl(e) {
    return function (n) {
      if (O() !== e) return;
      let r = n.from,
        s = n.to;
      const o = Kt(A.location.href);
      let i = r ? Kt(r) : void 0;
      const a = Kt(s);
      ((i != null && i.path) || (i = o),
        o.protocol === a.protocol && o.host === a.host && (s = a.relative),
        o.protocol === i.protocol && o.host === i.host && (r = i.relative),
        ce({ category: "navigation", data: { from: r, to: s } }));
    };
  }
  function pl(e) {
    return !!e && !!e.target;
  }
  const hl = [
      "EventTarget",
      "Window",
      "Node",
      "ApplicationCache",
      "AudioTrackList",
      "BroadcastChannel",
      "ChannelMergerNode",
      "CryptoOperation",
      "EventSource",
      "FileReader",
      "HTMLUnknownElement",
      "IDBDatabase",
      "IDBRequest",
      "IDBTransaction",
      "KeyOperation",
      "MediaController",
      "MessagePort",
      "ModalWindow",
      "Notification",
      "SVGElementInstance",
      "Screen",
      "SharedWorker",
      "TextTrack",
      "TextTrackCue",
      "TextTrackList",
      "WebSocket",
      "WebSocketWorker",
      "Worker",
      "XMLHttpRequest",
      "XMLHttpRequestEventTarget",
      "XMLHttpRequestUpload",
    ],
    ml = "BrowserApiErrors",
    gl = (e = {}) => {
      const t = {
        XMLHttpRequest: !0,
        eventTarget: !0,
        requestAnimationFrame: !0,
        setInterval: !0,
        setTimeout: !0,
        ...e,
      };
      return {
        name: ml,
        setupOnce() {
          (t.setTimeout && L(A, "setTimeout", _s),
            t.setInterval && L(A, "setInterval", _s),
            t.requestAnimationFrame && L(A, "requestAnimationFrame", yl),
            t.XMLHttpRequest &&
              "XMLHttpRequest" in A &&
              L(XMLHttpRequest.prototype, "send", _l));
          const n = t.eventTarget;
          n && (Array.isArray(n) ? n : hl).forEach(El);
        },
      };
    };
  function _s(e) {
    return function (...t) {
      const n = t[0];
      return (
        (t[0] = _e(n, {
          mechanism: {
            data: { function: K(e) },
            handled: !1,
            type: "instrument",
          },
        })),
        e.apply(this, t)
      );
    };
  }
  function yl(e) {
    return function (t) {
      return e.apply(this, [
        _e(t, {
          mechanism: {
            data: { function: "requestAnimationFrame", handler: K(e) },
            handled: !1,
            type: "instrument",
          },
        }),
      ]);
    };
  }
  function _l(e) {
    return function (...t) {
      const n = this;
      return (
        ["onload", "onerror", "onprogress", "onreadystatechange"].forEach(
          (s) => {
            s in n &&
              typeof n[s] == "function" &&
              L(n, s, function (o) {
                const i = {
                    mechanism: {
                      data: { function: s, handler: K(o) },
                      handled: !1,
                      type: "instrument",
                    },
                  },
                  a = Dt(o);
                return (a && (i.mechanism.data.handler = K(a)), _e(o, i));
              });
          },
        ),
        e.apply(this, t)
      );
    };
  }
  function El(e) {
    var r, s;
    const n = (r = A[e]) == null ? void 0 : r.prototype;
    (s = n == null ? void 0 : n.hasOwnProperty) != null &&
      s.call(n, "addEventListener") &&
      (L(n, "addEventListener", function (o) {
        return function (i, a, c) {
          try {
            Sl(a) &&
              (a.handleEvent = _e(a.handleEvent, {
                mechanism: {
                  data: { function: "handleEvent", handler: K(a), target: e },
                  handled: !1,
                  type: "instrument",
                },
              }));
          } catch {}
          return o.apply(this, [
            i,
            _e(a, {
              mechanism: {
                data: {
                  function: "addEventListener",
                  handler: K(a),
                  target: e,
                },
                handled: !1,
                type: "instrument",
              },
            }),
            c,
          ]);
        };
      }),
      L(n, "removeEventListener", function (o) {
        return function (i, a, c) {
          try {
            const u = a.__sentry_wrapped__;
            u && o.call(this, i, u, c);
          } catch {}
          return o.call(this, i, a, c);
        };
      }));
  }
  function Sl(e) {
    return typeof e.handleEvent == "function";
  }
  const bl = () => ({
      name: "BrowserSession",
      setupOnce() {
        if (typeof A.document > "u") {
          Oe &&
            _.warn(
              "Using the `browserSessionIntegration` in non-browser environments is not supported.",
            );
          return;
        }
        (Br({ ignoreDuration: !0 }),
          jr(),
          ms(({ from: e, to: t }) => {
            e !== void 0 && e !== t && (Br({ ignoreDuration: !0 }), jr());
          }));
      },
    }),
    wl = "GlobalHandlers",
    Tl = (e = {}) => {
      const t = { onerror: !0, onunhandledrejection: !0, ...e };
      return {
        name: wl,
        setupOnce() {
          Error.stackTraceLimit = 50;
        },
        setup(n) {
          (t.onerror && (vl(n), Es("onerror")),
            t.onunhandledrejection && (Al(n), Es("onunhandledrejection")));
        },
      };
    };
  function vl(e) {
    Pa((t) => {
      const { stackParser: n, attachStacktrace: r } = Ss();
      if (O() !== e || ds()) return;
      const { msg: s, url: o, line: i, column: a, error: c } = t,
        u = Il(tn(n, c || s, void 0, r, !1), o, i, a);
      ((u.level = "error"),
        Fr(u, {
          originalException: c,
          mechanism: { handled: !1, type: "onerror" },
        }));
    });
  }
  function Al(e) {
    xa((t) => {
      const { stackParser: n, attachStacktrace: r } = Ss();
      if (O() !== e || ds()) return;
      const s = Rl(t),
        o = It(s) ? Cl(s) : tn(n, s, void 0, r, !0);
      ((o.level = "error"),
        Fr(o, {
          originalException: s,
          mechanism: { handled: !1, type: "onunhandledrejection" },
        }));
    });
  }
  function Rl(e) {
    if (It(e)) return e;
    try {
      if ("reason" in e) return e.reason;
      if ("detail" in e && "reason" in e.detail) return e.detail.reason;
    } catch {}
    return e;
  }
  function Cl(e) {
    return {
      exception: {
        values: [
          {
            type: "UnhandledRejection",
            value: `Non-Error promise rejection captured with value: ${String(e)}`,
          },
        ],
      },
    };
  }
  function Il(e, t, n, r) {
    const s = (e.exception = e.exception || {}),
      o = (s.values = s.values || []),
      i = (o[0] = o[0] || {}),
      a = (i.stacktrace = i.stacktrace || {}),
      c = (a.frames = a.frames || []),
      u = r,
      l = n,
      f = $(t) && t.length > 0 ? t : Ot();
    return (
      c.length === 0 &&
        c.push({ colno: u, filename: f, function: se, in_app: !0, lineno: l }),
      e
    );
  }
  function Es(e) {
    Oe && _.log(`Global Handler attached: ${e}`);
  }
  function Ss() {
    const e = O();
    return (
      (e == null ? void 0 : e.getOptions()) || {
        stackParser: () => [],
        attachStacktrace: !1,
      }
    );
  }
  const Pl = () => ({
      name: "HttpContext",
      preprocessEvent(e) {
        var i, a;
        if (!A.navigator && !A.location && !A.document) return;
        const t = ((i = e.request) == null ? void 0 : i.url) || Ot(),
          { referrer: n } = A.document || {},
          { userAgent: r } = A.navigator || {},
          s = {
            ...((a = e.request) == null ? void 0 : a.headers),
            ...(n && { Referer: n }),
            ...(r && { "User-Agent": r }),
          },
          o = { ...e.request, ...(t && { url: t }), headers: s };
        e.request = o;
      },
    }),
    Ol = "cause",
    xl = 5,
    Dl = "LinkedErrors",
    kl = (e = {}) => {
      const t = e.limit || xl,
        n = e.key || Ol;
      return {
        name: Dl,
        preprocessEvent(r, s, o) {
          const i = o.getOptions();
          au(Qt, i.stackParser, n, t, r, s);
        },
      };
    };
  function Nl(e) {
    return [Zc(), Jc(), gl(), il(), Tl(), kl(), fu(), Pl(), bl()];
  }
  function Ll(e = {}) {
    var n;
    return {
      ...{
        defaultIntegrations: Nl(),
        release:
          typeof __SENTRY_RELEASE__ == "string"
            ? __SENTRY_RELEASE__
            : (n = A.SENTRY_RELEASE) == null
              ? void 0
              : n.id,
        sendClientReports: !0,
      },
      ...Ml(e),
    };
  }
  function Ml(e) {
    const t = {};
    for (const n of Object.getOwnPropertyNames(e)) {
      const r = n;
      e[r] !== void 0 && (t[r] = e[r]);
    }
    return t;
  }
  function Fl() {
    var c;
    const e = typeof A.window < "u" && A;
    if (!e) return !1;
    const t = e.chrome ? "chrome" : "browser",
      n = e[t],
      r = (c = n == null ? void 0 : n.runtime) == null ? void 0 : c.id,
      s = Ot() || "",
      o = [
        "chrome-extension:",
        "moz-extension:",
        "ms-browser-extension:",
        "safari-web-extension:",
      ],
      i = !!r && A === A.top && o.some((u) => s.startsWith(`${u}//`)),
      a = typeof e.nw < "u";
    return !!r && !i && !a;
  }
  function Bl(e = {}) {
    const t = Ll(e);
    if (!t.skipBrowserExtensionCheck && Fl()) {
      Oe &&
        he(() => {
          console.error(
            "[Sentry] You cannot run Sentry this way in a browser extension, check: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/",
          );
        });
      return;
    }
    Oe &&
      !us() &&
      _.warn(
        "No Fetch API detected. The Sentry SDK requires a Fetch API compatible environment to send events. Please add a Fetch API polyfill.",
      );
    const n = {
      ...t,
      stackParser: Ca(t.stackParser || sl),
      integrations: Tc(t),
      transport: t.transport || Ju,
    };
    return Nc(Mu, n);
  }
  Bl({ dsn: void 0, sendDefaultPii: !0 });
  class an {
    constructor(t) {
      if (!t || !t.injectionElementId || !t.apiKey)
        throw new Error(
          "Options with injectionElementId and apiKey are required.",
        );
      if (
        ((this.injectionElementId = t.injectionElementId),
        (this.adStatusCallbackFn = t.adStatusCallbackFn),
        (this.adErrorCallbackFn = t.adErrorCallbackFn),
        (this.apiKey = t.apiKey),
        (this.userId = t.userId || null),
        (this.customData = null),
        t.hasOwnProperty("customData"))
      ) {
        const n = t.customData;
        n !== null && typeof n == "object" && (this.customData = { ...n });
      }
      ((this.isThankYouModalDisabled = t.isThankYouModalDisabled || !1),
        (this.videoInfo = null),
        (this.playing_ = !1),
        (this.adsActive_ = !1),
        (this.adsDone_ = !1),
        (this.adOpts = null),
        (this.manuallyClosed_ = !1));
    }
    async initialize() {
      (await Promise.all([_i(), Ri(), Ei()]),
        (this.logger = new qs()),
        (this.injectionDiv = I(this.injectionElementId)),
        (this.injectionDiv.innerHTML += mi),
        (this.injectionDiv.innerHTML += gi),
        (this.injectionDiv.innerHTML += yi),
        (this.playButton_ = X()),
        this.playButton_.addEventListener(
          "click",
          le(this, this.startOrToggleImaAds),
          !1,
        ),
        (this.closeButton = Cs()),
        this.closeButton.addEventListener(
          "click",
          le(this, this.closePlayer),
          !1,
        ));
      try {
        const t = await hi(this.apiKey);
        ((this.googleTag = t.googleTag),
          (this.iu = t.iu),
          (this.isGpt = t.isGpt),
          (this.googlePageUrl = t.googlePageUrl),
          (this.videoMessage = t.videoMessage),
          (this.videoImageUrl = t.videoImageUrl));
      } catch (t) {
        console.error("Failed to load VAST data:", t);
        return;
      }
      ((this.videoPlayer_ = new js(this)),
        (this.ads_ = new xe(this, this.videoPlayer_)),
        (this.modal_ = new Si(this)),
        (this.gptAds_ = new wi(this)),
        (this.confirmModal_ = new bi(this, this.ads_)),
        (window.onresize = le(this, this.resizePlayerAndAds)),
        (this.videoEndedCallback_ = le(this, this.ads_.contentEnded)),
        this.setVideoEndedCallbackEnabled(!0),
        await this.setupVideoPlayerInfo());
    }
    setVideoEndedCallbackEnabled(t) {
      t
        ? this.videoPlayer_.registerVideoEndedCallback(this.videoEndedCallback_)
        : this.videoPlayer_.removeVideoEndedCallback(this.videoEndedCallback_);
    }
    pauseForAd() {
      (this.hideSpinner(),
        (this.adsActive_ = !0),
        (this.playing_ = !0),
        this.updatePlayButton());
    }
    adClicked() {
      (this.adsActive_ &&
        (this.playing_ ? this.ads_.pause() : this.ads_.resume()),
        (this.playing_ = !this.playing_),
        this.updatePlayButton());
    }
    async startOrToggleImaAds() {
      if (!this.adsDone_) {
        (this.ads_.initialUserAction(),
          this.videoPlayer_.preloadContent(le(this, this.loadAds_)),
          (this.adsDone_ = !0));
        const t = this;
        setTimeout(function () {
          t.closeButton.classList.remove("applixir-hide-element");
        }, 1e4);
        return;
      }
      (this.adsActive_ &&
        (this.playing_ ? this.ads_.pause() : this.ads_.resume()),
        (this.playing_ = !this.playing_),
        this.updatePlayButton());
    }
    updatePlayButton() {
      this.playing_
        ? this.playButton_.classList.add("applixir-hide-element")
        : this.playButton_.classList.remove("applixir-hide-element");
    }
    async loadAds_() {
      const t = this.googleTag,
        n = this.googlePageUrl,
        r = Ii().user_id;
      (this.videoPlayer_.removePreloadListener(),
        this.ads_.requestAds(t, n, r));
    }
    showSpinner() {
      (document
        .getElementById("applixir-spinner-container")
        .classList.remove("applixir-hide-element"),
        this.playButton_.classList.add("applixir-hide-element"));
    }
    hideSpinner() {
      (document
        .getElementById("applixir-spinner-container")
        .classList.add("applixir-hide-element"),
        this.playButton_.classList.remove("applixir-hide-element"));
    }
    async openPlayer() {
      if (((this.manuallyClosed_ = !1), this.showSpinner(), !Ci())) {
        (Pi(), Oi(this));
        return;
      }
      (this.videoPlayer_.videoPlayerContainer_.classList.remove(
        "applixir-hide-element",
      ),
        this.isGpt && this.gptAds_.rewardedSlot
          ? (await Ti(1e3),
            this.videoPlayer_.videoPlayerContainer_.classList.add(
              "applixir-hide-element",
            ),
            this.gptAds_.startGptAds())
          : (await this.startOrToggleImaAds(), this.resizePlayerAndAds()));
    }
    closePlayer() {
      ((this.manuallyClosed_ = !0),
        this.confirmModal_.show(),
        this.ads_.pause(),
        (this.playing_ = !1),
        this.updatePlayButton(),
        this.resizePlayerAndAds());
    }
    async allAdsCompleted() {
      (this.hideSpinner(),
        this.isThankYouModalDisabled || this.modal_.show(),
        Kn(this),
        this.videoPlayer_.videoPlayerContainer_.classList.add(
          "applixir-hide-element",
        ),
        this.updatePlayButton());
    }
    async adWatched() {
      await xi(this.apiKey, this.userId, this.customData);
    }
    resizePlayerAndAds() {
      const t = this.videoPlayer_.videoPlayerDiv_.clientWidth,
        n = this.videoPlayer_.videoPlayerDiv_.clientHeight;
      (this.videoPlayer_.resize(t, n), this.ads_.resize(t, n));
    }
    async setupVideoPlayerInfo() {
      (this.videoImageUrl &&
        this.videoPlayer_.contentPlayer.setAttribute(
          "poster",
          this.videoImageUrl,
        ),
        this.videoMessage &&
          (this.modal_.modalBodyParagraph.textContent = this.videoMessage));
    }
    confirmModalResumeClicked() {}
  }
  async function bs(e) {
    const t = new an(e);
    return (await t.initialize(), await t.openPlayer(), t);
  }
  ((window.Application = an),
    (window.initializeAndOpenPlayer = bs),
    (T.Application = an),
    (T.initializeAndOpenPlayer = bs),
    Object.defineProperty(T, Symbol.toStringTag, { value: "Module" }));
});
//# sourceMappingURL=app.umd.js.map
