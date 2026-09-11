// ==UserScript==
// @name         视频控制器
// @namespace    video-controller
// @description  120+KB的极简视频控制器，适配HTML5播放器。支持倍速（0.25x–16x）、音量增强（最高5x）、亮度增强（最高3x）。常规快捷键操作：倍速/快进/音量/逐帧/亮度/画面缩放。此外，支持屏幕全屏/网页全屏/旋转90°/水平翻转/画面拖动/截图/画中画/纯净模式，支持自动记忆网站设置/全局自动设置/色彩模式更改/区间循环播放。
// @version      1.2.7
// @license      MIT
// @author       Qiu Zongman
// @homepageURL  https://gitee.com/qiuzongman/video-controller
// @updateURL    https://gitee.com/qiuzongman/video-controller/raw/master/video-controller.js
// @downloadURL  https://gitee.com/qiuzongman/video-controller/raw/master/video-controller.js
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI5OSIgaGVpZ2h0PSIxMjk5IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiBvdmVyZmxvdz0iaGlkZGVuIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTY1NCkiPjxyZWN0IHg9IjAiIHk9IjY1NCIgd2lkdGg9IjEyOTkiIGhlaWdodD0iMTI5OSIgZmlsbD0iIzAwNzBDMCIvPjxwYXRoIGQ9Ik00NjIgMTAwMiA5ODEgMTMwMy41IDQ2MiAxNjA1WiIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjkxLjY2NjciIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZmlsbD0iI0ZGRkZGRiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9nPjwvc3ZnPg==
// @match        *://*/*
// @match        file:///*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==
//

(function () {
    'use strict';

    // 仅顶层页面运行，避免 iframe 内重复执行
    if (window.top !== window.self) return;

    const DEFAULT_SETTINGS = {
        togglePlay: ' ',
        speedUp: 'w',
        speedDown: 's',
        forward: 'ArrowRight',
        backward: 'ArrowLeft',
        frameForward: '',
        frameBackward: '',
        volumeUp: 'ArrowUp',
        volumeDown: 'ArrowDown',
        brightnessUp: '+',
        brightnessDown: '-',
        fullscreen: '',
        screenshot: '',
        rotateKey: '',
        flipKey: '',
        screenFullKey: '',
        pipKey: '',
        cleanKey: '',
        zoomUpKey: '',
        zoomDownKey: '',
        zoomStep: 0.1,
        panKey: '',
        speedStep: 0.5,
        volumeStep: 0.1,
        brightnessStep: 0.1,
        minSpeed: 0.25,
        maxSpeed: 16,
        maxVolume: 5.0,
        skipSeconds: 5,
        quickSpeed1Key: '1',
        quickSpeed1Val: 1.0,
        quickSpeed2Key: '2',
        quickSpeed2Val: 2.0,
        quickSpeed3Key: '3',
        quickSpeed3Val: 3.0,
        quickSpeed4Key: '4',
        quickSpeed4Val: 4.0,
        autoSpeedEnabled: false,
        autoSpeed: 1.0,
        autoVolumeEnabled: false,
        autoVolume: 1.0,
        loudnessEnabled: true,
        autoBrightness: 1.0,
        autoBrightnessEnabled: false,
        autoPlayEnabled: false,
        siteMemoryEnabled: true,
        noMemorySites: '',
        toastDuration: 3000,
        toastPosition: 'center-center',
        lastTab: 0,
        hideMenuEntry: false,
        openSettingsKey: '',
        biliProgressEnabled: true,
        favEnabled: false,
        autoNextEnabled: true,
        autoNextOrder: 'forward',
        autoNextWebDisabled: false,
    };

    const COLOR_PRESETS = {
        '默认':'brightness(1) contrast(1) saturate(1) hue-rotate(0deg)',
        '明亮':'brightness(1.2) contrast(1) saturate(1.1) hue-rotate(0deg)',
        '鲜艳':'brightness(1.1) contrast(1.15) saturate(1.6) hue-rotate(0deg)',
        '柔和':'brightness(1.05) contrast(0.85) saturate(0.75) hue-rotate(0deg)',
        '高对比':'brightness(1) contrast(1.5) saturate(1) hue-rotate(0deg)',
        '黑白':'brightness(1) contrast(1.1) saturate(0) hue-rotate(0deg)',
        '暖色':'brightness(1) contrast(1) saturate(1.15) hue-rotate(30deg)',
        '冷色':'brightness(1) contrast(1) saturate(1) hue-rotate(200deg)',
        '复古':'brightness(0.95) contrast(1.1) saturate(0.5) hue-rotate(340deg)',
        '反转':'brightness(1) contrast(1) saturate(1) hue-rotate(180deg)',
        '护眼':'brightness(0.7) contrast(0.85) saturate(0.85) hue-rotate(0deg)',
    };

    const STORAGE_KEY = 'vc_settings';
    let settings = {};

    function loadSettings() {
        try {
            const raw = typeof GM_getValue === 'function' ? GM_getValue(STORAGE_KEY, null) : null;
            settings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        } catch (e) {
            settings = { ...DEFAULT_SETTINGS };
        }
        if (!settings.openSettingsKey) settings.hideMenuEntry = false;
        if (settings.autoNextReverse !== undefined && !settings.autoNextOrder) {
            settings.autoNextOrder = settings.autoNextReverse ? 'reverse' : 'forward';
            delete settings.autoNextReverse;
        }
    }

    function saveSettings() {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(STORAGE_KEY, JSON.stringify(settings));
            }
        } catch (e) {}
    }

    const SITE_STORAGE_KEY = 'vc_site_settings';
    let siteSettings = {};

    function loadSiteSettings() {
        try {
            const raw = typeof GM_getValue === 'function' ? GM_getValue(SITE_STORAGE_KEY, null) : null;
            siteSettings = raw ? JSON.parse(raw) : {};
        } catch (e) {
            siteSettings = {};
        }
    }

    function saveSiteSettings() {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(SITE_STORAGE_KEY, JSON.stringify(siteSettings));
            }
        } catch (e) {}
    }

    function getCurrentSite() {
        return location.hostname;
    }

    function getSiteAuto(site) {
        return siteSettings[site] || null;
    }

    function setSiteAuto(site, auto) {
        siteSettings[site] = auto;
        saveSiteSettings();
    }

    function removeSiteAuto(site) {
        delete siteSettings[site];
        saveSiteSettings();
    }

    function hackAttachShadow() {
        if (window._vcHasHackAttachShadow_) return;
        try {
            window._vcShadowDomList_ = window._vcShadowDomList_ || [];
            const origAttach = window.Element.prototype.attachShadow;
            window.Element.prototype.attachShadow = function (init) {
                if (init && init.mode) {
                    init.mode = 'open';
                }
                const shadowRoot = origAttach.call(this, init);
                window._vcShadowDomList_.push(shadowRoot);
                document.dispatchEvent(new CustomEvent('vcAddShadowRoot', {
                    detail: { shadowRoot }
                }));
                return shadowRoot;
            };
            window._vcHasHackAttachShadow_ = true;
        } catch (e) {
            console.warn('[视频控制器] hackAttachShadow 失败:', e);
        }
    }

    let _toastEl = null;
    let _toastTimer = null;

    function Toast(msg) {
        if (settings.toastDuration === 0) return;
        if (!_toastEl) {
            _toastEl = document.createElement('div');
            _toastEl.style.cssText = [
                'all: initial;',
                'box-sizing: border-box;',
                'font-family: Arial, "Microsoft YaHei", sans-serif;',
                'min-width: 100px; padding: 0 14px;',
                'height: 40px; color: #fff; line-height: 40px;',
                'text-align: center; border-radius: 8px;',
                'position: fixed;',
                'z-index: 2147483647;',
                'background: rgba(0,0,0,0.78);',
                'pointer-events: none;',
                'transition: opacity 0.3s ease;',
                'font-size: 14px;',
                'white-space: nowrap;',
                'overflow: hidden;',
                'text-overflow: ellipsis;'
            ].join('');
            document.body.appendChild(_toastEl);
        }
        _toastEl.textContent = msg;
        var pos = settings.toastPosition || 'center-center';
        var margin = 20;
        var posStyles = {
            'top-left':     'top:' + margin + 'px;left:' + margin + 'px;max-width:calc(100vw - ' + (margin*2) + 'px);transform:none;',
            'top-center':   'top:' + margin + 'px;left:50%;transform:translateX(-50%);max-width:calc(100vw - ' + (margin*2) + 'px);',
            'top-right':    'top:' + margin + 'px;right:' + margin + 'px;left:auto;max-width:calc(100vw - ' + (margin*2) + 'px);transform:none;',
            'center-left':  'top:50%;left:' + margin + 'px;transform:translateY(-50%);max-width:calc(100vw - ' + (margin*2) + 'px);',
            'center-center':'top:50%;left:50%;transform:translate(-50%,-50%);max-width:calc(100vw - ' + (margin*2) + 'px);',
            'center-right': 'top:50%;right:' + margin + 'px;left:auto;transform:translateY(-50%);max-width:calc(100vw - ' + (margin*2) + 'px);',
            'bottom-left':  'bottom:' + margin + 'px;left:' + margin + 'px;max-width:calc(100vw - ' + (margin*2) + 'px);transform:none;',
            'bottom-center':'bottom:' + margin + 'px;left:50%;transform:translateX(-50%);max-width:calc(100vw - ' + (margin*2) + 'px);',
            'bottom-right': 'bottom:' + margin + 'px;right:' + margin + 'px;left:auto;max-width:calc(100vw - ' + (margin*2) + 'px);transform:none;'
        };
        _toastEl.style.cssText = _toastEl.style.cssText.replace(/top:[^;]*;|bottom:[^;]*;|left:[^;]*;|right:[^;]*;|transform:[^;]*;|max-width:[^;]*;/g, '') + (posStyles[pos] || posStyles['center-center']);
        _toastEl.style.opacity = '1';
        _toastEl.style.display = 'block';
        _toastEl.style.fontSize = '14px';
        _toastEl.style.lineHeight = '40px';
        _toastEl.style.color = '#fff';
        _toastEl.style.textAlign = 'center';
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => {
            _toastEl.style.opacity = '0';
            _toastTimer = setTimeout(() => { _toastEl.style.display = 'none'; }, 300);
        }, settings.toastDuration);
    }

    const audioCtxMap = new WeakMap();

    function getAudioBoost(video) {
        var record = audioCtxMap.get(video);
        if (record) return record;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            var ctx = new AC();
            ctx.resume();
            var source = ctx.createMediaElementSource(video);
            var analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            var gain = ctx.createGain();
            source.connect(analyser);
            analyser.connect(gain);
            gain.connect(ctx.destination);
            record = { ctx, source, analyser, gain, loudnessComp: 1, loudnessBuf: [], loudnessTimer: null };
            audioCtxMap.set(video, record);
            return record;
        } catch (e) {
            audioCtxMap.delete(video);
            return null;
        }
    }

    function setVideoVolume(video, vol) {
        var clamped = Math.max(0, Math.min(settings.maxVolume, vol));
        if (location.protocol === 'file:') clamped = Math.min(1, clamped);
        var record = audioCtxMap.get(video);
        var actual;
        var comp = settings.loudnessEnabled && record ? record.loudnessComp : 1;
        if (record) {
            video.volume = 1.0;
            record.gain.gain.value = clamped * comp;
            actual = clamped;
        } else if (clamped > 1.0) {
            record = getAudioBoost(video);
            if (record) {
                video.volume = 1.0;
                record.gain.gain.value = clamped * comp;
                actual = clamped;
            } else {
                actual = Math.min(1, clamped);
                video.volume = actual;
            }
        } else {
            actual = clamped;
            video.volume = actual;
        }
        return actual;
    }

    function getVideoVolume(video) {
        var record = audioCtxMap.get(video);
        if (record) {
            if (settings.loudnessEnabled && record.loudnessComp > 0) {
                return record.gain.gain.value / record.loudnessComp;
            }
            return record.gain.gain.value;
        }
        return video.volume;
    }

    const VIDEO_SEL = 'video, bwp-video';

    function findAllVideos() {
        const videos = [];
        document.querySelectorAll(VIDEO_SEL).forEach(function(v) { videos.push(v); });
        try {
            document.querySelectorAll('*').forEach(function(el) {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll(VIDEO_SEL).forEach(function(v) { videos.push(v); });
                }
            });
        } catch (e) {}
        if (window._vcShadowDomList_) {
            window._vcShadowDomList_.forEach(function(sr) {
                try {
                    if (sr && sr.querySelectorAll) {
                        sr.querySelectorAll(VIDEO_SEL).forEach(function(v) {
                            if (!videos.includes(v)) videos.push(v);
                        });
                    }
                } catch (e) {}
            });
        }
        return videos;
    }

    function getActiveVideo() {
        const videos = findAllVideos();
        if (videos.length === 0) return null;
        for (let i = 0; i < videos.length; i++) {
            if (!videos[i].paused) return videos[i];
        }
        let best = null;
        let bestArea = 0;
        for (let i = 0; i < videos.length; i++) {
            const r = videos[i].getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                const area = r.width * r.height;
                if (area > bestArea) {
                    bestArea = area;
                    best = videos[i];
                }
            }
        }
        if (best) return best;
        return videos[0];
    }

    var _sessionSpeed, _sessionVolume, _sessionBrightness;
    var _autoNextHandler = null, _autoNextTimer = null, _webAutoNextDisabled = false;

    function hijackPlaybackRate() {
        if (window._vcHijackPR) return;
        window._vcHijackPR = true;
        try {
            var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
            if (!desc || !desc.set) return;
            var origSet = desc.set;
            Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
                get: function() { return desc.get.call(this); },
                set: function(v) {
                    origSet.call(this, v);
                    _sessionSpeed = v;
                },
                configurable: true
            });
        } catch(e) {}
    }

    function changeSpeed(video, delta) {
        if (!video) return;
        var r = (video.playbackRate / settings.speedStep).toFixed(2);
        var newRate = (Math.round(r) + delta / settings.speedStep) * settings.speedStep;
        newRate = Math.max(settings.minSpeed, Math.min(settings.maxSpeed, newRate));
        newRate = Math.round(newRate * 100) / 100;
        _sessionSpeed = newRate;
        video.playbackRate = newRate;
        saveSiteMem('speed', newRate);
        Toast('倍速 ' + newRate.toFixed(2) + 'x');
    }

    function skipTime(video, seconds) {
        if (!video || isNaN(video.duration)) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }

    function changeVolume(video, delta) {
        if (!video) return;
        var rec = audioCtxMap.get(video);
        var curVol;
        if (rec && settings.loudnessEnabled && _sessionVolume !== undefined) {
            curVol = _sessionVolume;
        } else {
            curVol = getVideoVolume(video);
        }
        var baseVol = rec ? curVol * video.volume : curVol;
        var newVol = Math.round(baseVol / settings.volumeStep) * settings.volumeStep + delta;
        newVol = Math.max(0, Math.min(settings.maxVolume, newVol));
        var actual = setVideoVolume(video, newVol);
        _sessionVolume = actual;
        saveSiteMem('volume', actual);
        Toast('音量 ' + Math.round(actual * 100) + '%');
    }

    function changeBrightness(video, delta) {
        if (!video) return;
        var val = (video._vcBrightness || 1.0) + delta;
        val = Math.round(val / settings.brightnessStep) * settings.brightnessStep;
        val = Math.max(0, Math.min(3, val));
        _sessionBrightness = val;
        video._vcBrightness = val;
        video.style.filter = 'brightness(' + val + ')';
        saveSiteMem('brightness', val);
        Toast('亮度 ' + Math.round(val * 100) + '%');
    }

    function setBrightness(video, val) {
        if (!video) return;
        video._vcBrightness = val;
        video.style.filter = val === 1 ? '' : 'brightness(' + val + ')';
    }

    function checkLoop() {
        var v = this;
        var loop = v._vcLoop;
        if (!loop) return;
        if (v.currentTime >= loop.end) {
            if (loop.count > 0 && loop.cur >= loop.count - 1) return;
            if (loop.count > 0) loop.cur++;
            v.currentTime = loop.start;
        }
    }

    function togglePip(video) {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(function(){});
            if (video._vcPipHidden) {
                for (var i = 0; i < video._vcPipHidden.length; i++) {
                    video._vcPipHidden[i].style.display = video._vcPipHidden[i]._vcOrigDisplay || '';
                }
                video._vcPipHidden = null;
            }
            Toast('画中画：关闭');
        } else {
            video.requestPictureInPicture().then(function() {
                setTimeout(function() {
                    var hidden = [];
                    var el = video.parentElement;
                    for (var i = 0; i < 10 && el && el !== document.body; i++) {
                        var cs = window.getComputedStyle(el);
                        if ((cs.position === 'fixed' || cs.position === 'absolute') && cs.display !== 'none' && el.offsetWidth > 150) {
                            el._vcOrigDisplay = cs.display;
                            el.style.display = 'none';
                            hidden.push(el);
                        }
                        el = el.parentElement;
                    }
                    video._vcPipHidden = hidden;
                }, 300);
            }).catch(function(){});
            Toast('画中画：开启');
        }
    }

    var _vcWebFullStyle = null;
    function toggleScreenFull(video) {
        var isYoutube = location.hostname === 'www.youtube.com';
        if (isYoutube) {
            if (video._vcWebFull) {
                var zTopNodes = video._vcWebFullZTopNodes || [];
                zTopNodes.forEach(function(n) { n.classList.remove('vc-fp-zTop'); });
                var innerNodes = video._vcWebFullInnerNodes || [];
                innerNodes.forEach(function(n) { n.classList.remove('vc-fp-innerBox'); });
                var fillNodes = video._vcWebFullFillNodes || [];
                fillNodes.forEach(function(n) { n.classList.remove('vc-fp-fillBox'); n.classList.remove('vc-fp-absCover'); });
                var player = document.querySelector('#movie_player') || document.querySelector('#ytd-player');
                if (player) { player.classList.remove('vc-fp-wrapper'); player.style.removeProperty('--vc-fp-vw'); player.style.removeProperty('--vc-fp-vh'); }
                document.documentElement.classList.remove('vc-fp-root');
                document.body.classList.remove('vc-fp-body');
                document.documentElement.style.overflow = '';
                if (_vcWebFullStyle) { _vcWebFullStyle.remove(); _vcWebFullStyle = null; }
                if (video._vcWebFullSyncHandler) { window.removeEventListener('resize', video._vcWebFullSyncHandler, true); window.visualViewport?.removeEventListener('resize', video._vcWebFullSyncHandler); video._vcWebFullSyncHandler = null; }
                video._vcWebFull = false;
                video._vcWebFullZTopNodes = null;
                video._vcWebFullInnerNodes = null;
                video._vcWebFullFillNodes = null;
                video._vcWebFullSyncVp = null;
                setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);
                Toast('退出网页全屏');
            } else {
                if (document.fullscreenElement) {
                    document.exitFullscreen().then(function() {
                        setTimeout(function() { toggleScreenFull(video); }, 100);
                    }).catch(function() {});
                    return;
                }
                var player = document.querySelector('#movie_player') || document.querySelector('#ytd-player');
                if (!player) { Toast('未找到播放器'); return; }
                if (!_vcWebFullStyle) {
                    _vcWebFullStyle = document.createElement('style');
                    _vcWebFullStyle.textContent = '.vc-fp-root,.vc-fp-body{overflow:hidden!important;scrollbar-width:none}.vc-fp-root::-webkit-scrollbar,.vc-fp-body::-webkit-scrollbar{display:none}.vc-fp-body .vc-fp-zTop{position:relative!important;z-index:2147483646!important;transform:none!important;contain:none!important;perspective:none!important;filter:none!important;backdrop-filter:none!important}.vc-fp-wrapper{display:block!important;position:fixed!important;inset:0!important;width:var(--vc-fp-vw,100vw)!important;height:var(--vc-fp-vh,100vh)!important;min-width:var(--vc-fp-vw,100vw)!important;min-height:var(--vc-fp-vh,100vh)!important;max-width:var(--vc-fp-vw,100vw)!important;max-height:var(--vc-fp-vh,100vh)!important;padding:0!important;margin:0!important;background:#000!important;z-index:2147483647!important;overflow:hidden!important;transform:none!important;contain:none!important;aspect-ratio:auto!important}.vc-fp-wrapper .vc-fp-innerBox,.vc-fp-wrapper .vc-fp-fillBox{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:100%!important;margin:0!important;padding:0!important;aspect-ratio:auto!important;box-sizing:border-box!important;flex:1 1 auto!important}.vc-fp-wrapper .vc-fp-absCover{position:absolute!important;inset:0!important}.vc-fp-wrapper video.vc-fp-innerBox,.vc-fp-wrapper video.vc-fp-fillBox{object-fit:contain!important;background:#000!important}.vc-fp-body #masthead-container,.vc-fp-body ytd-masthead,.vc-fp-body #secondary,.vc-fp-body #below,.vc-fp-body ytd-playlist-panel-renderer,.vc-fp-body #comments,.vc-fp-body #panels{display:none!important;opacity:0!important;visibility:hidden!important}.vc-fp-body #page-manager,.vc-fp-body ytd-app,.vc-fp-body #columns,.vc-fp-body #primary{margin:0!important;padding:0!important;top:0!important}.vc-fp-body ytd-app,.vc-fp-body #page-manager,.vc-fp-body ytd-watch-flexy,.vc-fp-body #player-theater-container,.vc-fp-body #full-bleed-container{contain:none!important;transform:none!important;perspective:none!important;filter:none!important;backdrop-filter:none!important}.vc-fp-body #player-theater-container,.vc-fp-body #full-bleed-container{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;max-height:100vh!important;min-height:100vh!important;z-index:2147483644!important;background:#000!important;margin:0!important;padding:0!important}';
                    document.head.appendChild(_vcWebFullStyle);
                }
                var zTopNodes = [];
                var zp = player.parentElement;
                while (zp && zp !== document.body) { zTopNodes.push(zp); zp = zp.parentElement; }
                zTopNodes.forEach(function(n) { n.classList.add('vc-fp-zTop'); });
                var innerNodes = [];
                var ip = video;
                while (ip && ip !== player) { if (ip.nodeType === 1) innerNodes.push(ip); ip = ip.parentElement; }
                innerNodes.forEach(function(n) { n.classList.add('vc-fp-innerBox'); });
                var fillNodes = [];
                var playerRect = player.getBoundingClientRect();
                var playerArea = playerRect.width * playerRect.height;
                var candidates = player.querySelectorAll('video, canvas, iframe, embed, object, [class], [id]');
                for (var ci = 0; ci < candidates.length && fillNodes.length < 120; ci++) {
                    var cn = candidates[ci];
                    if (cn === player) continue;
                    var cr = cn.getBoundingClientRect();
                    var ca = cr.width * cr.height;
                    if (ca >= Math.max(100, playerArea * 0.35) && cr.width >= Math.max(80, playerRect.width * 0.35) && cr.height >= Math.max(60, playerRect.height * 0.35)) {
                        fillNodes.push(cn);
                        cn.classList.add('vc-fp-fillBox');
                        var cs = getComputedStyle(cn);
                        if (cs.position === 'absolute' || cs.position === 'fixed') cn.classList.add('vc-fp-absCover');
                    }
                }
                video._vcWebFullZTopNodes = zTopNodes;
                video._vcWebFullInnerNodes = innerNodes;
                video._vcWebFullFillNodes = fillNodes;
                document.documentElement.classList.add('vc-fp-root');
                document.body.classList.add('vc-fp-body');
                document.documentElement.style.overflow = 'hidden';
                player.classList.add('vc-fp-wrapper');
                function _vcFpSyncVp() {
                    var vv = window.visualViewport;
                    var vw = Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 0);
                    var vh = Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 0);
                    if (vw) player.style.setProperty('--vc-fp-vw', vw + 'px');
                    if (vh) player.style.setProperty('--vc-fp-vh', vh + 'px');
                }
                _vcFpSyncVp();
                video._vcWebFullSyncVp = _vcFpSyncVp;
                video._vcWebFullSyncHandler = function() { _vcFpSyncVp(); setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 60); };
                window.addEventListener('resize', video._vcWebFullSyncHandler, true);
                window.visualViewport?.addEventListener('resize', video._vcWebFullSyncHandler);
                video._vcWebFull = true;
                setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);
                setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 80);
                setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 240);
                Toast('进入网页全屏');
            }
            return;
        }
        var btn = document.querySelector('.bpx-player-ctrl-web,.dplayer-full-icon[data-name="web"],.vjs-remaining-time,.plyr__control[data-plyr="fullscreen"][data-size="small"],[aria-label="网页全屏"],[title="网页全屏"]');
        if (btn) { btn.click(); return; }
        if (video._vcSFParent) {
            var wrap = video._vcSFParent;
            var inner = wrap.firstChild;
            if (inner) {
                wrap.parentElement.insertBefore(inner, wrap);
                inner.style.cssText = video._vcSFOrigCss || '';
            }
            wrap.remove();
            video._vcSFParent = null;
            video._vcSFOrigCss = null;
            Toast('退出网页全屏');
        } else {
            var el = video.parentElement;
            for (var i = 0; i < 5 && el; i++) {
                if (el.querySelectorAll('video').length >= 1 && el.offsetWidth > 200) break;
                el = el.parentElement;
            }
            if (!el || el === document.body) el = video;
            video._vcSFOrigCss = el.style.cssText;
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;background:#000';
            el.parentElement.insertBefore(wrap, el);
            wrap.appendChild(el);
            video._vcSFParent = wrap;
            Toast('进入网页全屏');
        }
    }

    function toggleFlip(video) {
        video._vcFlipped = !video._vcFlipped;
        applyVideoTransform(video);
        Toast(video._vcFlipped ? '水平翻转：开启' : '水平翻转：关闭');
    }

    function applyVideoTransform(video) {
        var t = '';
        if (video.style.position === 'absolute') t += ' translate(-50%,-50%)';
        var px = video._vcPanX || 0;
        var py = video._vcPanY || 0;
        if (px || py) t += ' translate(' + px + 'px,' + py + 'px)';
        var z = video._vcZoom || 1;
        if (z !== 1) t += ' scale(' + z + ')';
        var r = video._vcRotate || 0;
        if (r !== 0) t += ' rotate(' + r + 'deg)';
        if (video._vcFlipped) t += ' scaleX(-1)';
        video.style.transform = t || '';
    }

    function changeZoom(video, delta) {
        if (!video) return;
        var z = (video._vcZoom || 1) + delta;
        z = Math.round(z / settings.zoomStep) * settings.zoomStep;
        z = Math.max(0.1, Math.min(5, z));
        video._vcZoom = z;
        applyVideoTransform(video);
        Toast('缩放 ' + Math.round(z * 100) + '%');
    }

    var _panVideo = null;
    var _panX = 0, _panY = 0, _panOX = 0, _panOY = 0;
    function togglePanMode() {
        if (_panVideo) {
            _panVideo.style.cursor = '';
            _panVideo._vcPanX = 0;
            _panVideo._vcPanY = 0;
            applyVideoTransform(_panVideo);
            _panVideo = null;
            Toast('画面拖动：关闭');
            return;
        }
        var v = getActiveVideo();
        if (!v) return;
        _panVideo = v;
        v.style.cursor = 'grab';
        Toast('画面拖动：开启（拖拽鼠标移动画面）');
    }

    function autoRotate(video) {
        var deg = ((video._vcRotate || 0) + 90) % 360;
        video._vcRotate = deg;
        if (deg % 180 !== 0) {
            var x1 = video.clientWidth || video.offsetWidth || 640;
            var y1 = video.clientHeight || video.offsetHeight || 360;
            if (x1 && y1 && x1 !== y1) {
                video.style.width  = (x1 > y1 ? y1 : x1 * x1 / y1) + 'px';
                video.style.height = (x1 > y1 ? y1 * y1 / x1 : x1) + 'px';
            }
            video.style.position = 'absolute';
            video.style.top = '50%';
            video.style.left = '50%';
        } else {
            video.style.position = '';
            video.style.top = '';
            video.style.left = '';
            video.style.width = '';
            video.style.height = '';
        }
        applyVideoTransform(video);
        Toast('旋转 ' + deg + '°');
    }

    var _cleanMode = false;
    var _cleanEls = [];
    var _cleanSheet = null;
    function toggleCleanMode() {
        _cleanMode = !_cleanMode;
        if (!_cleanMode) {
            for (var i = 0; i < _cleanEls.length; i++) {
                _cleanEls[i].classList.remove('vc-clean-lock');
            }
            _cleanEls = [];
            if (_cleanSheet) { _cleanSheet.remove(); _cleanSheet = null; }
            Toast('纯净模式：关闭');
            return;
        }
        if (!_cleanSheet) {
            _cleanSheet = document.createElement('style');
            _cleanSheet.id = 'vc-clean-sheet';
            _cleanSheet.textContent = '.vc-clean-lock{display:none!important}';
            document.head.appendChild(_cleanSheet);
        }
        var v = getActiveVideo();
        if (!v) { _cleanMode = false; return; }
        var p = v.parentElement;
        for (var d = 0; d < 4 && p && p !== document.body; d++) {
            var kids = p.children;
            for (var k = 0; k < kids.length; k++) {
                var el = kids[k];
                if (el === v || el.contains(v)) continue;
                if (el.tagName === 'VIDEO' || el.tagName === 'SOURCE') continue;
                el.classList.add('vc-clean-lock');
                _cleanEls.push(el);
            }
            v = p;
            p = p.parentElement;
        }
        Toast('纯净模式：开启');
    }

    function screenshot(video) {
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
        try {
            var c = document.createElement('canvas');
            c.width = video.videoWidth;
            c.height = video.videoHeight;
            var ctx = c.getContext('2d');
            ctx.filter = video.style.filter || 'none';
            ctx.drawImage(video, 0, 0, c.width, c.height);
            c.toBlob(function(blob) {
                if (!blob) return;
                var item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(function() {
                    Toast('已截图并复制到剪贴板');
                }).catch(function() {
                    Toast('复制失败（需 HTTPS 或 localhost）');
                });
            });
        } catch (e) {
            Toast('截图失败');
        }
    }

    function onVideoPlay(e) {
        const video = e.target;
        if (!video || video.tagName !== 'VIDEO') return;
        if (settings.loudnessEnabled) {
            getAudioBoost(video);
            startLoudnessAnalysis(video);
        } else {
            stopLoudnessAnalysis(video);
        }
        if (settings.autoSpeedEnabled) {
            var rate = parseFloat(settings.autoSpeed);
            if (!isNaN(rate) && rate >= settings.minSpeed && rate <= settings.maxSpeed) {
                _sessionSpeed = Math.round(rate * 100) / 100;
                video.playbackRate = rate;
            }
        } else if (_sessionSpeed !== undefined) {
            video.playbackRate = _sessionSpeed;
        }
        if (settings.autoVolumeEnabled) {
            var vv = parseFloat(settings.autoVolume);
            if (!isNaN(vv) && vv >= 0 && vv <= settings.maxVolume) {
                _sessionVolume = vv;
                setVideoVolume(video, vv);
            }
        } else if (_sessionVolume !== undefined) {
            setVideoVolume(video, _sessionVolume);
        }
        if (settings.autoBrightnessEnabled) {
            var bb = parseFloat(settings.autoBrightness);
            if (!isNaN(bb) && bb >= 0 && bb <= 3) {
                _sessionBrightness = bb;
                setBrightness(video, bb);
            }
        } else if (_sessionBrightness !== undefined) {
            setBrightness(video, _sessionBrightness);
        }
        var site = getSiteAuto(getCurrentSite());
        if (settings.siteMemoryEnabled && site && !isNoMemory(getCurrentSite())) {
            if (site.speed !== undefined) { _sessionSpeed = Math.round(site.speed * 100) / 100; video.playbackRate = _sessionSpeed; }
            if (site.volume !== undefined) { _sessionVolume = site.volume; setVideoVolume(video, site.volume); }
            if (site.brightness !== undefined) { _sessionBrightness = site.brightness; setBrightness(video, site.brightness); }
        }
    }

    function startLoudnessAnalysis(video) {
        var record = audioCtxMap.get(video);
        if (!record || !record.analyser) return;
        if (record.loudnessTimer) return;
        record.loudnessBuf = [];
        record.loudnessComp = 1;
        var update = function() {
            if (!video || video.paused || video.ended) {
                record.loudnessTimer = null;
                return;
            }
            var data = new Uint8Array(record.analyser.frequencyBinCount);
            record.analyser.getByteTimeDomainData(data);
            var sum = 0;
            for (var i = 0; i < data.length; i++) {
                sum += Math.abs(data[i] - 128);
            }
            var rms = sum / data.length / 128;
            record.loudnessBuf.push(rms);
            if (record.loudnessBuf.length > 20) record.loudnessBuf.shift();
            var avg = 0;
            for (var i = 0; i < record.loudnessBuf.length; i++) avg += record.loudnessBuf[i];
            avg /= record.loudnessBuf.length;
            if (avg > 0.01 && settings.loudnessEnabled) {
                var targetRms = 0.15;
                var newComp = targetRms / avg;
                newComp = Math.max(0.5, Math.min(2, newComp));
                record.loudnessComp += (newComp - record.loudnessComp) * 0.1;
                var curVol = getVideoVolume(video);
                if (curVol >= 0) {
                    record.gain.gain.value = curVol * record.loudnessComp;
                }
            }
            record.loudnessTimer = requestAnimationFrame(update);
        };
        record.loudnessTimer = requestAnimationFrame(update);
    }

    function stopLoudnessAnalysis(video) {
        var record = audioCtxMap.get(video);
        if (!record || !record.loudnessTimer) return;
        cancelAnimationFrame(record.loudnessTimer);
        record.loudnessTimer = null;
    }

    function bindVideoEvents(video) {
        if (video._vcEventsBound) return;
        video._vcEventsBound = true;
        video.addEventListener('playing', onVideoPlay);
        video.addEventListener('volumechange', function() {
            _sessionVolume = getVideoVolume(video);
        });
        video.addEventListener('pause', function() { stopLoudnessAnalysis(video); });
        video.addEventListener('ended', function() { stopLoudnessAnalysis(video); });
        if (settings.autoPlayEnabled) {
            video.play().catch(function(){});
        }
    }

    function isNoMemory(host) {
        var list = (settings.noMemorySites || '').split('\n');
        for (var i = 0; i < list.length; i++) {
            if (list[i].trim() === host) return true;
        }
        return false;
    }

    function saveSiteMem(key, val) {
        if (!settings.siteMemoryEnabled || isNoMemory(getCurrentSite())) return;
        var s = getSiteAuto(getCurrentSite()) || {};
        s[key] = (key === 'speed') ? Math.round(val * 100) / 100 : val;
        setSiteAuto(getCurrentSite(), s);
    }

    // ======================= B站多P/合集进度 =======================
    var biliProgress = {
        el: null, data: null, timer: null,
        getData: function() {
            try {
                var root = window.app || document.querySelector('#app');
                var data = root && root.__vue__ && root.__vue__.videoData;
                if (!data) return null;
                var result = {};
                var bvid = (location.pathname.match(/\/video\/([^\/?#]+)/) || [0,''])[1];
                var p = parseInt(new URLSearchParams(location.search).get('p')) || 1;
                if (data.pages && data.pages.length > 1) {
                    var multi = data.pages.map(function(pg){ return +pg.duration || 0; });
                    var before = p > 1 ? multi.slice(0, p - 1).reduce(function(a,b){return a+b;}) : 0;
                    result.multi = { before: before, total: multi.reduce(function(a,b){return a+b;}) };
                }
                if (data.ugc_season && data.ugc_season.sections) {
                    var eps = data.ugc_season.sections[0].episodes;
                    if (eps && eps.length > 1) {
                        // 剧集总时长：多P视频累加所有分P
                        function epTotal(ep) {
                            if (ep.pages && ep.pages.length > 1) {
                                var s = 0;
                                for (var pi = 0; pi < ep.pages.length; pi++) s += +ep.pages[pi].duration || 0;
                                return s;
                            }
                            return +ep.page.duration || 0;
                        }
                        var total = 0, before = 0, found = false;
                        for (var i = 0; i < eps.length; i++) {
                            var d = epTotal(eps[i]);
                            total += d;
                            if (found) continue;
                            if (eps[i].bvid === bvid) {
                                found = true;
                                if (data.pages && data.pages.length > 1 && p > 1) {
                                    before += data.pages.slice(0, p - 1).reduce(function(a,b){return a + (+b || 0);}, 0);
                                }
                            }
                            else { before += d; }
                        }
                        result.collection = { before: before, total: total };
                    }
                }
                return (result.multi || result.collection) ? result : null;
            } catch(e) { return null; }
        },
        setup: function() {
            this.data = this.getData();
            if (!this.data) return;
            var tl = document.querySelector('.bpx-player-ctrl-time-label');
            if (!tl) return;
            if (document.getElementById('vc-bili-progress')) return;
            var el = document.createElement('span');
            el.id = 'vc-bili-progress';
            el.style.cssText = 'color:#eee;padding-left:12px;font-size:13px;white-space:nowrap';
            tl.style.display = 'inline-block';
            tl.style.width = 'unset';
            tl.insertAdjacentElement('beforeend', el);
            tl.parentElement.style.minWidth = 'max-content';
            this.el = el;
            this.update();
            try {
                var p = window.player || window.fPlayer || (document.querySelector('video') && document.querySelector('video').player);
                if (p && p.on) p.on("Player_TimeUpdate", this.update.bind(this));
                else this.updateInterval = setInterval(this.update.bind(this), 1000);
            } catch(e) { this.updateInterval = setInterval(this.update.bind(this), 1000); }
            var mp = document.getElementById('multi_page');
            if (mp) mp.addEventListener('click', function() { setTimeout(function(){ biliProgress.data = biliProgress.getData(); biliProgress.update(); }, 500); });
            // SPA 导航触发刷新
            window.addEventListener('popstate', function() { biliProgress._lastUrl = ''; });
        },
        update: function() {
            if (!this.el) return;
            this.data = this.getData();
            if (!this.data) { this.el.textContent = ''; return; }
            var now = 0;
            try {
                var p = window.player || window.fPlayer;
                if (p && p.getCurrentTime) now = parseInt(p.getCurrentTime());
                else {
                    var v = document.querySelector('video');
                    if (v) now = parseInt(v.currentTime);
                }
            } catch(e) {}
            var parts = [];
            var multi = this.data.multi, coll = this.data.collection;
            if (multi && multi.total > 0) {
                var pct = (((now + multi.before) / multi.total) * 100).toFixed(1);
                parts.push('多P: ' + pct + '%');
            }
            if (coll && coll.total > 0) {
                // 多P补偿：非第1P时补充已播分P的时长到合集before
                var collBefore = coll.before + (multi && multi.before || 0);
                var pct = (((now + collBefore) / coll.total) * 100).toFixed(1);
                parts.push('合集: ' + pct + '%');
            }
            this.el.textContent = parts.join('    ');
        }
    };

    function biliProgressInit() {
        if (location.hostname !== 'www.bilibili.com') return;
        if (!settings.biliProgressEnabled) return;
        if (biliProgress.timer) return;
        biliProgress.timer = setInterval(function() {
            var tl = document.querySelector('.bpx-player-ctrl-time-label');
            var root = window.app || document.querySelector('#app');
            var ready = tl && root && root.__vue__ && root.__vue__.videoData;
            if (ready) {
                clearInterval(biliProgress.timer);
                biliProgress.timer = null;
                biliProgress.setup();
            }
        }, 1000);
    }

    // ======================= B站自动切集 =======================
    function injectNextUI() {
        if (location.hostname !== 'www.bilibili.com') return;
        var old = document.querySelector('#vc-next-ui');
        if (old && old.tagName === 'SPAN' && old.textContent.indexOf('切集') >= 0) { old.remove(); }
        if (!settings.autoNextEnabled) {
            var el = document.getElementById('vc-next-ui');
            if (el) el.remove();
            return;
        }
        _webAutoNextDisabled = settings.autoNextWebDisabled || false;
        if (document.querySelector('#vc-next-ui')) return;
        var container = document.querySelector('.base-video-sections-v1,.video-pod.video-pod');
        // 番剧页面
        if (!container && isBangumi()) {
            var ss = document.querySelector('.SectionSelector_SectionSelector__TZ_QZ');
            if (!ss) return;
            var div = document.createElement('div');
            div.id = 'vc-next-ui';
            div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:2px 16px;margin:0;line-height:1;font-size:13px;color:var(--text3,#99a2aa)';
            div.innerHTML = '<span class="vc-nl">自动切集</span><span class="vc-ns" data-key="enabled"></span><span class="vc-nl" style="margin-left:6px">顺序</span><span class="vc-ns" data-key="order"></span>';
            ss.parentNode.insertBefore(div, ss);
            buildNextToggles(div);
            return;
        }
        if (!container) return;
        var div = document.createElement('div');
        div.id = 'vc-next-ui';
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:0;margin:0;line-height:1;font-size:13px;color:var(--text3,#99a2aa)';
        div.innerHTML = '<span class="vc-nl">自动切集</span><span class="vc-ns" data-key="enabled"></span><span class="vc-nl" style="margin-left:6px">顺序</span><span class="vc-ns" data-key="order"></span>';
        var ref = container.querySelector('.header-top,.video-sections-head');
        if (ref) { ref.parentNode.insertBefore(div, ref); }
        else { container.insertBefore(div, container.firstChild); }
        buildNextToggles(div);
    }

    function buildNextToggles(div) {
        div.querySelectorAll('.vc-ns').forEach(function(el) {
            var key = el.getAttribute('data-key');
            if (key === 'enabled') {
                var toggle = document.createElement('span');
                toggle.className = 'vc-next-switch';
                toggle.style.cssText = 'display:inline-block;position:relative;width:30px;height:20px;border:1px solid #ccc;outline:none;border-radius:10px;box-sizing:border-box;background:#ccc;cursor:pointer;vertical-align:middle;transition:border-color .2s,background-color .2s';
                var dot = document.createElement('span');
                dot.style.cssText = 'position:absolute;top:1px;left:1px;border-radius:100%;width:16px;height:16px;background-color:#fff;transition:all .2s';
                toggle.appendChild(dot);
                el.parentNode.replaceChild(toggle, el);

                function sync() {
                    var on = settings.autoNextEnabled && !_webAutoNextDisabled;
                    toggle.style.borderColor = on ? '#00aeec' : '#ccc';
                    toggle.style.background = on ? '#00aeec' : '#ccc';
                    dot.style.left = on ? '11px' : '1px';
                }
                sync();

                toggle.addEventListener('click', function() {
                    _webAutoNextDisabled = !_webAutoNextDisabled;
                    settings.autoNextWebDisabled = _webAutoNextDisabled;
                    saveSettings();
                    setupAutoNext(_webAutoNextDisabled ? 'off' : getNextMode());
                    sync();
                });
            } else if (key === 'order') {
                var orderSpan = document.createElement('span');
                orderSpan.className = 'vc-next-order';
                orderSpan.style.cssText = 'display:inline-flex;gap:0;border:1px solid #64b5f6;border-radius:4px;overflow:hidden;cursor:pointer;vertical-align:middle';
                ['正序','倒序','随机'].forEach(function(label, idx) {
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = label;
                    btn.style.cssText = 'padding:0 10px;line-height:25px;border:none;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px';
                    btn.addEventListener('click', function() {
                        var orders = ['forward','reverse','random'];
                        settings.autoNextOrder = orders[idx];
                        saveSettings();
                        setupAutoNext(getNextMode());
                        syncOrder();
                    });
                    orderSpan.appendChild(btn);
                });
                el.parentNode.replaceChild(orderSpan, el);

                function syncOrder() {
                    var orders = ['forward','reverse','random'];
                    var btns = orderSpan.querySelectorAll('button');
                    btns.forEach(function(btn, idx) {
                        var active = settings.autoNextOrder === orders[idx];
                        btn.style.background = active ? '#90caf9' : '#e3f2fd';
                        btn.style.color = active ? '#0d47a1' : '#1565c0';
                    });
                }
                syncOrder();
            }
        });
    }

    function _onVideoEndedAuto(mode) {
        // 番剧页面
        if (isBangumi()) {
            var cards = document.querySelectorAll('.numberListItem_number_list_item__T2VKO');
            if (!cards.length) return;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i].classList.contains('numberListItem_select__WgCVr')) {
                    var target;
                    if (mode === 'reverse') {
                        target = i > 0 ? cards[i - 1] : cards[cards.length - 1];
                    } else if (mode === 'random') {
                        var rand = Math.floor(Math.random() * cards.length);
                        target = cards[rand];
                    } else {
                        target = i < cards.length - 1 ? cards[i + 1] : cards[0];
                    }
                    if (mode === 'reverse' && i === 0) {
                        var ss = document.querySelectorAll('.SectionSelector_sectionItem__rFNEH');
                        for (var si = 0; si < ss.length; si++) {
                            if (ss[si].classList.contains('SectionSelector_active__dySMp')) {
                                var nextSi = si > 0 ? si - 1 : ss.length - 1;
                                ss[nextSi].click();
                                return;
                            }
                        }
                    } else if (mode !== 'reverse' && mode !== 'random' && i === cards.length - 1) {
                        var ss = document.querySelectorAll('.SectionSelector_sectionItem__rFNEH');
                        for (var si = 0; si < ss.length; si++) {
                            if (ss[si].classList.contains('SectionSelector_active__dySMp')) {
                                var nextSi = si < ss.length - 1 ? si + 1 : 0;
                                ss[nextSi].click();
                                return;
                            }
                        }
                    }
                    var link = target.querySelector('a');
                    if (link) { link.click(); }
                    return;
                }
            }
            return;
        }
        // 普通视频页面
        var cards = document.querySelectorAll('.video-episode-card,.video-pod__item');
        if (!cards.length) return;
        for (var i = 0; i < cards.length; i++) {
            var gif = cards[i].querySelector('.playing-gif');
            if (gif && gif.style.display !== 'none') {
                var target;
                if (mode === 'reverse') {
                    target = i > 0 ? cards[i - 1] : cards[cards.length - 1];
                } else if (mode === 'random') {
                    var rand = Math.floor(Math.random() * cards.length);
                    target = cards[rand];
                } else {
                    target = i < cards.length - 1 ? cards[i + 1] : cards[0];
                }
                var btn = target.querySelector('.simple-base-item') || target.querySelector('a') || target;
                if (btn) { btn.click(); }
                return;
            }
        }
    }

    function getNextMode() {
        if (!settings.autoNextEnabled) return 'off';
        return settings.autoNextOrder || 'forward';
    }

    function isBangumi() {
        return location.pathname.indexOf('/bangumi/play/') >= 0;
    }

    function setupAutoNext(mode) {
        if (location.hostname !== 'www.bilibili.com') return;
        try { localStorage.setItem('bpx_player_continue_play', mode !== 'off' ? '1' : '0'); } catch(e) {}
        if (_autoNextTimer) { clearInterval(_autoNextTimer); _autoNextTimer = null; }
        var v = document.querySelector('video');
        if (v && _autoNextHandler) {
            v.removeEventListener('ended', _autoNextHandler);
            _autoNextHandler = null;
        }
        if (mode !== 'off') {
            if (!v) { setTimeout(function() { setupAutoNext(mode); }, 1000); return; }
            _autoNextHandler = function() { _onVideoEndedAuto(mode); };
            v.addEventListener('ended', _autoNextHandler);
            _autoNextTimer = setInterval(function() {
                var vv = document.querySelector('video');
                if (vv && _autoNextHandler) {
                    vv.removeEventListener('ended', _autoNextHandler);
                    vv.addEventListener('ended', _autoNextHandler);
                }
            }, 10000);
        }
    }

    function bindAllVideos() {
        const videos = findAllVideos();
        for (let i = 0; i < videos.length; i++) {
            bindVideoEvents(videos[i]);
        }
    }

    function isEditableElement(el) {
        if (!el) return false;
        const tag = el.tagName || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
        let p = el.parentElement;
        while (p) {
            if (p.isContentEditable || p.getAttribute('contenteditable') === 'true') return true;
            if (p.shadowRoot) {
                p = p.host || p.parentElement;
                continue;
            }
            p = p.parentElement;
        }
        return false;
    }

    function isTypingElement(el) {
        const active = document.activeElement;
        if (active) {
            if (isEditableElement(active)) return true;
            if (active.shadowRoot) {
                const shadowActive = active.shadowRoot.activeElement;
                if (shadowActive && isEditableElement(shadowActive)) return true;
            }
        }
        if (window._vcShadowDomList_) {
            for (let i = 0; i < window._vcShadowDomList_.length; i++) {
                const sr = window._vcShadowDomList_[i];
                try {
                    if (sr.activeElement && isEditableElement(sr.activeElement)) return true;
                } catch (_) {}
            }
        }
        try {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                let node = sel.anchorNode;
                if (node.nodeType === 3) node = node.parentNode;
                if (isEditableElement(node)) return true;
            }
        } catch (_) {}
        if (el && isEditableElement(el)) return true;
        return false;
    }

    var _vcHandledKeys = new Set();
    function onKeyDown(e) {
        if (isTypingElement(e.target)) {
            return;
        }
        if (e.key === 'Escape') {
            var _escV = getActiveVideo();
            if (_escV && _escV._vcWebFull) {
                toggleScreenFull(_escV);
                e.preventDefault();
                return;
            }
        }
        if (e.metaKey) return;
        if (onKeyDown._lk === e.key && Date.now() - onKeyDown._lt < 150) return;
        onKeyDown._lk = e.key;
        onKeyDown._lt = Date.now();
        var combo = '';
        if (e.ctrlKey) combo += 'Ctrl+';
        if (e.altKey) combo += 'Alt+';
        combo += e.key;
        if (settings.openSettingsKey && combo === settings.openSettingsKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openSettings();
            return;
        }
        const video = getActiveVideo();
        if (!video) return;
        let handled = false;
        function m(k) { return k && k !== '' && combo === k; }
        if (m(settings.togglePlay)) { video.paused ? video.play() : video.pause(); Toast(video.paused ? '已暂停' : '已播放'); handled = true; }
        if (m(settings.speedUp)) { changeSpeed(video, settings.speedStep); handled = true; }
        if (m(settings.speedDown)) { changeSpeed(video, -settings.speedStep); handled = true; }
        if (m(settings.forward)) { skipTime(video, settings.skipSeconds); Toast('快进 ' + settings.skipSeconds + 's'); handled = true; }
        if (m(settings.backward)) { skipTime(video, -settings.skipSeconds); Toast('快退 ' + settings.skipSeconds + 's'); handled = true; }
        if (m(settings.frameForward)) { skipTime(video, 1 / 30); Toast('逐帧+'); handled = true; }
        if (m(settings.frameBackward)) { skipTime(video, -1 / 30); Toast('逐帧-'); handled = true; }
        if (m(settings.volumeUp)) { changeVolume(video, settings.volumeStep); handled = true; }
        if (m(settings.volumeDown)) { changeVolume(video, -settings.volumeStep); handled = true; }
        if (m(settings.brightnessUp)) { changeBrightness(video, settings.brightnessStep); handled = true; }
        if (m(settings.brightnessDown)) { changeBrightness(video, -settings.brightnessStep); handled = true; }
        if (m(settings.fullscreen)) {
            var fsBtn = document.querySelector('.ytp-fullscreen-button,.bpx-player-ctrl-full,.dplayer-full-icon,.vjs-fullscreen-control,.jw-icon-fullscreen,.plyr__control[data-plyr="fullscreen"],.mejs-fullscreen-button,.video-js .vjs-fullscreen-control,[aria-label="全屏"],[aria-label="Fullscreen"],[title="全屏"],[title="Fullscreen"]');
            if (fsBtn) { fsBtn.click(); handled = true; }
            else {
                var wasFull = !!document.fullscreenElement;
                if (wasFull) { document.exitFullscreen().catch(function(){}); }
                else { video.requestFullscreen().catch(function(){}); }
                Toast(wasFull ? '退出屏幕全屏' : '屏幕全屏'); handled = true;
            }
        }
        if (m(settings.screenshot)) { screenshot(video); handled = true; }
        if (m(settings.rotateKey)) { autoRotate(video); handled = true; }
        if (m(settings.flipKey)) { toggleFlip(video); handled = true; }
        if (m(settings.screenFullKey)) { toggleScreenFull(video); handled = true; }
        if (m(settings.pipKey)) { togglePip(video); handled = true; }
        if (m(settings.cleanKey)) { toggleCleanMode(); handled = true; }
        if (m(settings.zoomUpKey)) { changeZoom(video, settings.zoomStep); handled = true; }
        if (m(settings.zoomDownKey)) { changeZoom(video, -settings.zoomStep); handled = true; }
        if (m(settings.panKey)) { togglePanMode(); handled = true; }
        for (let i = 1; i <= 4; i++) {
            if (m(settings['quickSpeed' + i + 'Key'])) {
                _sessionSpeed = Math.round(settings['quickSpeed' + i + 'Val'] * 100) / 100;
                video.playbackRate = _sessionSpeed;
                saveSiteMem('speed', settings['quickSpeed' + i + 'Val']);
                Toast('倍速 ' + settings['quickSpeed' + i + 'Val'].toFixed(1) + 'x');
                handled = true;
                break;
            }
        }
        if (handled) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            _vcHandledKeys.add(e.key);
        }
    }
    function onKeyUp(e) {
        if (_vcHandledKeys.has(e.key)) {
            _vcHandledKeys.delete(e.key);
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
        }
    }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    function openSettings() {
        const existing = document.getElementById('vc-settings-panel');
        if (existing) {
            existing.remove();
            return;
        }
        const host = document.createElement('div');
        host.id = 'vc-settings-panel';
        host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
        const shadow = host.attachShadow({ mode: 'open' });
        const panel = document.createElement('div');
        panel.style.cssText = [
            'box-sizing: border-box;',
            'position: fixed; top: 50%; left: 50%;',
            'transform: translate(-50%, -50%);',
            'background: #fff; padding: 20px;',
            'border: 2px solid #555; border-radius: 8px;',
            'z-index: 2147483647; width: 560px;',
            'max-height: 85vh;',
            'display: flex; flex-direction: column;',
            'font-size: 13px; line-height: 1.4;',
            'font-family: Arial, "Microsoft YaHei", sans-serif;',
            'color: #333;',
            'pointer-events: auto;'
        ].join('');
        var html = buildSettingsHTML();
        if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
            try {
                var policy = trustedTypes.createPolicy('vc-settings#1', { createHTML: function(s) { return s; } });
                panel.innerHTML = policy.createHTML(html);
            } catch(e) {
                panel.innerHTML = html;
            }
        } else {
            panel.innerHTML = html;
        }
        panel.id = 'vc-settings-panel';
        shadow.appendChild(panel);
        var mountHost = document.fullscreenElement || document.body;
        if (mountHost && mountHost.tagName === 'VIDEO') mountHost = mountHost.parentElement;
        mountHost.appendChild(host);
        bindSettingsEvents(panel);
    }

    function buildSettingsHTML() {
        const s = settings;
        const esc = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const displayKey = (v) => {
            if (v === '') return '';
            if (v === ' ') return 'Space';
            return v;
        };

        return `
<style>
.vc-row { display: flex; gap: 12px; margin-bottom: 0; color: #333; }
.vc-part { flex: 1; min-width: 0; }
.vc-item { display: grid; grid-template-columns: 52px 60px 1fr; gap: 4px; align-items: center; margin-bottom: 5px; height: 28px; }
.vc-lbl { color: #555; white-space: nowrap; }
.vc-num input { box-sizing: border-box; width: 100%; padding: 4px; border: 1px solid #bbb; border-radius: 4px; text-align: center; background: #f9f9f9; -moz-appearance: textfield; }
input[type="number"] { -moz-appearance: textfield; }
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
#vc-ls, #vc-le, #vc-lc { border: 1px solid #bbb; background: #f9f9f9; }
.vc-ctl input, .vc-ctl select { box-sizing: border-box; width: 100%; max-width: 180px; padding: 4px 8px; border: 1px solid #bbb; border-radius: 4px; cursor: pointer; color: #333; }
.vc-ctl input { background: #fff3cd; text-align: center; }
.vc-ctl input[type="number"] { background: #f9f9f9; }
.vc-ctl select { background: #fff3cd; text-align: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; }
.vc-ctl input:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.25); background: #fff; }
.vc-num input:focus, #vc-ls:focus, #vc-le:focus, #vc-lc:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.25); background: #fff; }
#vc-noMemorySites { border: 1px solid #bbb; }
#vc-noMemorySites { margin-bottom: -5px; }
#vc-noMemorySites:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.25); }
.vc-ctl input::placeholder { color: #bbb; }
.vc-item input, .vc-item select, .vc-item button, .vc-dual button { height: 25px; box-sizing: border-box; }
.vc-hint { color: #999; }
#vc-page4 a { text-decoration: none; color: #1a73e8 !important; }
.vc-btn { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; color: #fff; }
.vc-btn:hover { filter: brightness(0.9); }
.vc-btn-save { background: #4CAF50; }
.vc-btn-cancel { background: #f44336; }
.vc-btn-reset { background: #ff9800; }
</style>

<div id="vc-content" style="flex:1;overflow-y:auto">
<div id="vc-page1"><div class="vc-row">
  <div class="vc-part">
    <div class="vc-item"><span class="vc-lbl">倍速+</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-speedUp" class="vc-key-input" value="${esc(displayKey(s.speedUp))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">音量+</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-volumeUp" class="vc-key-input" value="${esc(displayKey(s.volumeUp))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">亮度+</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-brightnessUp" class="vc-key-input" value="${esc(displayKey(s.brightnessUp))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">画面缩放+</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-zoomUpKey" class="vc-key-input" value="${esc(displayKey(s.zoomUpKey))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">逐帧+</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-frameForward" class="vc-key-input" value="${esc(displayKey(s.frameForward))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">快进</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-forward" class="vc-key-input" value="${esc(displayKey(s.forward))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">固定倍速</span><span class="vc-num"><input type="number" id="vc-qk1Val" value="${s.quickSpeed1Val}" min="0.25" max="16" step="0.25"></span><span class="vc-ctl"><input type="text" id="vc-qk1" class="vc-key-input" value="${esc(displayKey(s.quickSpeed1Key))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">固定倍速</span><span class="vc-num"><input type="number" id="vc-qk2Val" value="${s.quickSpeed2Val}" min="0.25" max="16" step="0.25"></span><span class="vc-ctl"><input type="text" id="vc-qk2" class="vc-key-input" value="${esc(displayKey(s.quickSpeed2Key))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">固定倍速</span><span class="vc-num"><input type="number" id="vc-qk3Val" value="${s.quickSpeed3Val}" min="0.25" max="16" step="0.25"></span><span class="vc-ctl"><input type="text" id="vc-qk3" class="vc-key-input" value="${esc(displayKey(s.quickSpeed3Key))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">固定倍速</span><span class="vc-num"><input type="number" id="vc-qk4Val" value="${s.quickSpeed4Val}" min="0.25" max="16" step="0.25"></span><span class="vc-ctl"><input type="text" id="vc-qk4" class="vc-key-input" value="${esc(displayKey(s.quickSpeed4Key))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item" style="margin-bottom:0"><span class="vc-lbl">暂停</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-togglePlay" class="vc-key-input" value="${esc(displayKey(s.togglePlay))}" readonly placeholder="点击后按键"></span></div>
  </div>
  <div class="vc-part">
    <div class="vc-item"><span class="vc-lbl">倍速-</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-speedDown" class="vc-key-input" value="${esc(displayKey(s.speedDown))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">音量-</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-volumeDown" class="vc-key-input" value="${esc(displayKey(s.volumeDown))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">亮度-</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-brightnessDown" class="vc-key-input" value="${esc(displayKey(s.brightnessDown))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">画面缩放-</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-zoomDownKey" class="vc-key-input" value="${esc(displayKey(s.zoomDownKey))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">逐帧-</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-frameBackward" class="vc-key-input" value="${esc(displayKey(s.frameBackward))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">快退</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-backward" class="vc-key-input" value="${esc(displayKey(s.backward))}" readonly placeholder="点击后按键"></span></div>
    <div class="vc-item"><span class="vc-lbl">倍速步长</span><span class="vc-num"></span><span class="vc-ctl"><input type="number" id="vc-speedStep" value="${s.speedStep}" min="0.05" max="5" step="0.05"></span></div>
    <div class="vc-item"><span class="vc-lbl">音量步长</span><span class="vc-num"></span><span class="vc-ctl"><input type="number" id="vc-volumeStep" value="${s.volumeStep}" min="0.01" max="1" step="0.01"></span></div>
    <div class="vc-item"><span class="vc-lbl">亮度步长</span><span class="vc-num"></span><span class="vc-ctl"><input type="number" id="vc-brightnessStep" value="${s.brightnessStep}" min="0.01" max="1" step="0.05"></span></div>
    <div class="vc-item"><span class="vc-lbl">缩放步长</span><span class="vc-num"></span><span class="vc-ctl"><input type="number" id="vc-zoomStep" value="${s.zoomStep}" min="0.01" max="2" step="0.05"></span></div>
    <div class="vc-item" style="margin-bottom:0"><span class="vc-lbl">快进秒数</span><span class="vc-num"></span><span class="vc-ctl"><input type="number" id="vc-skipSeconds" value="${s.skipSeconds}" min="0" step="1"></span></div>
  </div>
</div></div>
<div id="vc-page2" style="display:none">
  <div class="vc-row">
    <div class="vc-part">
      <div class="vc-item"><span class="vc-lbl">屏幕全屏</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-fullscreen" class="vc-key-input" value="${esc(displayKey(s.fullscreen))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">网页全屏</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-screenFullKey" class="vc-key-input" value="${esc(displayKey(s.screenFullKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">旋转90°</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-rotateKey" class="vc-key-input" value="${esc(displayKey(s.rotateKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">水平翻转</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-flipKey" class="vc-key-input" value="${esc(displayKey(s.flipKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">画面拖动</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-panKey" class="vc-key-input" value="${esc(displayKey(s.panKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">截图</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-screenshot" class="vc-key-input" value="${esc(displayKey(s.screenshot))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">画中画</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-pipKey" class="vc-key-input" value="${esc(displayKey(s.pipKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">纯净模式</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-cleanKey" class="vc-key-input" value="${esc(displayKey(s.cleanKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">进入设置</span><span class="vc-num"></span><span class="vc-ctl"><input type="text" id="vc-openSettingsKey" class="vc-key-input" value="${esc(displayKey(s.openSettingsKey))}" readonly placeholder="点击后按键"></span></div>
      <div class="vc-item"><span class="vc-lbl">提示时长</span><span class="vc-num" style="font-size:11px;color:#999">(0=关闭)</span><span class="vc-ctl"><input type="number" id="vc-toastDuration" value="${s.toastDuration}" min="0" max="30000" step="500"></span></div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:0;height:28px;font-size:13px">
        <span style="color:#444">提示位置</span><span></span>
        <select id="vc-toastPosition" style="height:25px;box-sizing:border-box;padding:4px 8px;border:1px solid #64b5f6;border-radius:4px;font-size:13px;background:#90caf9;color:#0d47a1;cursor:pointer;text-align:center;max-width:180px;-webkit-appearance:none;-moz-appearance:none;appearance:none">
          <option value="top-left" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='top-left'?' selected':''}>左上</option>
          <option value="top-center" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='top-center'?' selected':''}>中上</option>
          <option value="top-right" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='top-right'?' selected':''}>右上</option>
          <option value="center-left" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='center-left'?' selected':''}>左中</option>
          <option value="center-center" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='center-center'?' selected':''}>中中</option>
          <option value="center-right" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='center-right'?' selected':''}>右中</option>
          <option value="bottom-left" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='bottom-left'?' selected':''}>左下</option>
          <option value="bottom-center" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='bottom-center'?' selected':''}>中下</option>
          <option value="bottom-right" style="background:#e3f2fd;color:#1565c0"${s.toastPosition==='bottom-right'?' selected':''}>右下</option>
        </select>
      </div>
    </div>
    <div class="vc-part">
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px">
        <span style="font-weight:bold;font-size:13px;color:#444">视频收藏</span><span></span>
        <span style="display:flex;justify-content:flex-end"><span class="vc-dual" id="vc-favEnabled" data-value="${s.favEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.favEnabled ? '#64b5f6' : '#90caf9'};border-radius:4px 0 0 4px;background:${s.favEnabled ? '#90caf9' : '#e3f2fd'};color:${s.favEnabled ? '#0d47a1' : '#1565c0'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.favEnabled ? '#90caf9' : '#64b5f6'};border-left:none;border-radius:0 4px 4px 0;background:${s.favEnabled ? '#e3f2fd' : '#90caf9'};color:${s.favEnabled ? '#1565c0' : '#0d47a1'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px">
        <span style="font-weight:bold;font-size:13px;color:#444">标准音量</span><span></span>
        <span style="display:flex;justify-content:flex-end"><span class="vc-dual" id="vc-loudnessEnabled" data-value="${s.loudnessEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.loudnessEnabled ? '#64b5f6' : '#90caf9'};border-radius:4px 0 0 4px;background:${s.loudnessEnabled ? '#90caf9' : '#e3f2fd'};color:${s.loudnessEnabled ? '#0d47a1' : '#1565c0'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.loudnessEnabled ? '#90caf9' : '#64b5f6'};border-left:none;border-radius:0 4px 4px 0;background:${s.loudnessEnabled ? '#e3f2fd' : '#90caf9'};color:${s.loudnessEnabled ? '#1565c0' : '#0d47a1'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px">
        <span style="font-weight:bold;color:#444">色彩模式</span><span></span>
        <select id="vc-preset" style="height:25px;box-sizing:border-box;padding:4px 8px;border:1px solid #64b5f6;border-radius:4px;font-size:13px;background:#90caf9;color:#0d47a1;cursor:pointer;text-align:center;max-width:180px;-webkit-appearance:none;-moz-appearance:none;appearance:none">${(()=>{var p=COLOR_PRESETS; return Object.keys(p).map(function(k){return '<option value="'+k+'" style="background:#e3f2fd;color:#1565c0">'+k+'</option>';}).join('')+'<option value="自定义" style="background:#e3f2fd;color:#999">自定义</option>';})()}</select>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">亮度</span><span id="vc-cb-v" style="text-align:center">100%</span>
        <span style="display:flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cb-m">-</span>
          <input type="range" id="vc-cb-r" min="0" max="300" value="100" style="flex:1;width:100%">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cb-p">+</span>
        </span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">对比度</span><span id="vc-cc-v" style="text-align:center">100%</span>
        <span style="display:flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cc-m">-</span>
          <input type="range" id="vc-cc-r" min="0" max="200" value="100" style="flex:1;width:100%">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cc-p">+</span>
        </span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">饱和度</span><span id="vc-cs-v" style="text-align:center">100%</span>
        <span style="display:flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cs-m">-</span>
          <input type="range" id="vc-cs-r" min="0" max="200" value="100" style="flex:1;width:100%">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-cs-p">+</span>
        </span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">色调</span><span id="vc-ch-v" style="text-align:center">0</span>
        <span style="display:flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-ch-m">-</span>
          <input type="range" id="vc-ch-r" min="0" max="360" value="0" style="flex:1;width:100%">
          <span style="display:inline-block;width:24px;line-height:24px;text-align:center;border:1px solid #bbb;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;flex-shrink:0" id="vc-ch-p">+</span>
        </span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px">
        <span style="font-weight:bold;font-size:13px;color:#444">区间循环</span><span></span>
        <span style="display:flex;justify-content:flex-end"><span class="vc-dual" id="vc-loop-toggle" data-value="0" style="display:flex;gap:0;width:100%"><button type="button" style="padding:0;line-height:25px;border:1px solid #64b5f6;border-radius:4px 0 0 4px;background:#90caf9;color:#0d47a1;cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid #90caf9;border-left:none;border-radius:0 4px 4px 0;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px;flex:1">关闭</button></span></span>
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">区间起点</span><span></span>
        <input id="vc-ls" style="padding:4px 8px;border-radius:4px;font-size:13px;text-align:center;width:100%;max-width:180px;box-sizing:border-box" placeholder="时:分:秒">
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:5px;height:28px;font-size:13px;color:#333">
        <span style="color:#555">区间终点</span><span></span>
        <input id="vc-le" style="padding:4px 8px;border-radius:4px;font-size:13px;text-align:center;width:100%;max-width:180px;box-sizing:border-box" placeholder="时:分:秒">
      </div>
      <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;margin-bottom:0;height:28px;font-size:13px;color:#333">
        <span style="color:#555">循环次数</span><span style="color:#999;font-size:11px">(0=无限)</span>
        <input id="vc-lc" type="number" style="padding:4px 8px;border-radius:4px;font-size:13px;text-align:center;width:100%;max-width:180px;box-sizing:border-box" value="1">
      </div>
    </div>
  </div>
</div>
<div id="vc-page3" style="display:none"><div class="vc-row">
  <div class="vc-part">
    <div style="font-weight:bold;font-size:13px;color:#444;margin-bottom:5px;height:28px;line-height:28px">全局自动</div>
    <div class="vc-item"><span class="vc-lbl">自动倍速</span><span class="vc-num"><input type="number" id="vc-autoSpeed" value="${s.autoSpeed}" min="0.25" max="16" step="0.25"></span><span class="vc-ctl"><span class="vc-dual" id="vc-autoSpeedEnabled" data-color="yellow" data-value="${s.autoSpeedEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoSpeedEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.autoSpeedEnabled ? '#ffd54f' : '#fff3cd'};color:${s.autoSpeedEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoSpeedEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.autoSpeedEnabled ? '#fff3cd' : '#ffd54f'};color:${s.autoSpeedEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
    <div class="vc-item"><span class="vc-lbl">自动音量</span><span class="vc-num"><input type="number" id="vc-autoVolume" value="${s.autoVolume}" min="0" max="5" step="0.05"></span><span class="vc-ctl"><span class="vc-dual" id="vc-autoVolumeEnabled" data-color="yellow" data-value="${s.autoVolumeEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoVolumeEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.autoVolumeEnabled ? '#ffd54f' : '#fff3cd'};color:${s.autoVolumeEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoVolumeEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.autoVolumeEnabled ? '#fff3cd' : '#ffd54f'};color:${s.autoVolumeEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
    <div class="vc-item"><span class="vc-lbl">自动亮度</span><span class="vc-num"><input type="number" id="vc-autoBrightness" value="${s.autoBrightness}" min="0" max="3" step="0.05"></span><span class="vc-ctl"><span class="vc-dual" id="vc-autoBrightnessEnabled" data-color="yellow" data-value="${s.autoBrightnessEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoBrightnessEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.autoBrightnessEnabled ? '#ffd54f' : '#fff3cd'};color:${s.autoBrightnessEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoBrightnessEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.autoBrightnessEnabled ? '#fff3cd' : '#ffd54f'};color:${s.autoBrightnessEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
    <div class="vc-item"><span class="vc-lbl">自动播放</span><span class="vc-num"></span><span class="vc-ctl"><span class="vc-dual" id="vc-autoPlayEnabled" data-color="yellow" data-value="${s.autoPlayEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoPlayEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.autoPlayEnabled ? '#ffd54f' : '#fff3cd'};color:${s.autoPlayEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoPlayEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.autoPlayEnabled ? '#fff3cd' : '#ffd54f'};color:${s.autoPlayEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>

  </div>
  <div class="vc-part">
    <div class="vc-item"><span class="vc-lbl" style="font-weight:bold">站点记忆</span><span class="vc-num"></span><span class="vc-ctl"><span class="vc-dual" id="vc-siteMemoryEnabled" data-value="${s.siteMemoryEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.siteMemoryEnabled ? '#64b5f6' : '#90caf9'};border-radius:4px 0 0 4px;background:${s.siteMemoryEnabled ? '#90caf9' : '#e3f2fd'};color:${s.siteMemoryEnabled ? '#0d47a1' : '#1565c0'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.siteMemoryEnabled ? '#90caf9' : '#64b5f6'};border-left:none;border-radius:0 4px 4px 0;background:${s.siteMemoryEnabled ? '#e3f2fd' : '#90caf9'};color:${s.siteMemoryEnabled ? '#1565c0' : '#0d47a1'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
    <div style="display:grid;grid-template-columns:52px 60px 1fr;gap:4px;align-items:center;height:28px;margin-top:1px;margin-bottom:6px"><span style="font-size:13px;color:#444">禁止站点</span><span></span><button type="button" id="vc-addNomemory" style="padding:0 8px;line-height:22px;border:1px solid #ff9800;border-radius:4px;background:#ffd54f;color:#3e2723;cursor:pointer;font-size:13px;white-space:nowrap;width:100%;box-sizing:border-box">禁止当前网站</button></div>
    <textarea id="vc-noMemorySites" style="box-sizing:border-box;width:100%;height:125px;padding:4px 6px;border-radius:4px;font-size:13px;color:#333;resize:none" placeholder="每行一个域名，如&#10;www.example.com&#10;v.example.com"></textarea>
  </div>
</div></div>
<div id="vc-page4" style="display:none">
<div style="font-weight:bold;font-size:13px;color:#444;margin-bottom:5px;height:28px;line-height:28px">视频控制器 v1.2.7</div>
<div style="display:grid;grid-template-columns:52px 1fr;column-gap:6px;row-gap:2px">
<span style="color:#555">作者</span><span><a href="https://space.bilibili.com/423767625" target="_blank" style="color:#1a73e8">邱宗满</a></span>
<span style="color:#555">邮箱</span><span>qiuzongman@foxmail.com</span>
<span style="color:#555">许可证</span><span>MIT</span>
<span style="color:#555">项目地址</span><span><a href="https://gitee.com/qiuzongman/video-controller" target="_blank" style="color:#1a73e8">Gitee</a></span>
</div>
<div style="font-weight:bold;font-size:13px;color:#444;margin:14px 0 6px">🫶 支援我买 Token 继续改进代码</div>
<div style="margin-bottom:4px;font-size:13px;font-weight:bold;color:#555">微信</div>
<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NTAiIGhlaWdodD0iNDUwIiBzaGFwZS1yZW5kZXJpbmc9ImNyaXNwRWRnZXMiIHZpZXdCb3g9IjAgMCA0NTAgNDUwIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+CiAgPHBhdGggZD0iTTAgMGg3MHYxMEgwem04MCAwaDEwdjEwSDgwem0zMCAwaDQwdjEwaC00MHptNTAgMGgyMHYxMGgtMjB6bTQwIDBoMTB2MjBoLTEwem0zMCAwaDIwdjIwaC0yMHptMzAgMGgyMHYxMGgtMjB6bTQwIDBoNDB2MTBoLTQwem02MCAwaDEwdjEwaC0xMHptMjAgMGg3MHYxMGgtNzB6TTAgMTBoMTB2NjBIMHptNjAgMGgxMHY2MEg2MHptNDAgMGg0MHYxMGgtNDB6bTUwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNDAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2NDBoLTEwem05MCAwaDEwdjQwaC0xMHptMzAgMGgxMHY2MGgtMTB6bTYwIDBoMTB2NjBoLTEwek0yMCAyMGgzMHYzMEgyMHptODAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MjBoLTEwem01MCAwaDEwdjIwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTMwIDBoMjB2MTBoLTIwem01MCAwaDIwdjEwaC0yMHptMTEwIDBoMzB2MzBoLTMwek05MCAzMGgxMHYzMEg5MHptMzAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MzBoLTEwem0yMCAwaDEwdjIwaC0xMHptNjAgMGgxMHYyMGgtMTB6bTQwIDBoMjB2MTBoLTIwem00MCAwaDMwdjEwaC0zMHptNTAgMGgxMHYyMGgtMTB6TTgwIDQwaDEwdjMwSDgwem02MCAwaDEwdjMwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTQwIDBoMzB2MTBoLTMwem00MCAwaDIwdjEwaC0yMHptNDAgMGgxMHYxMGgtMTB6bTQwIDBoMzB2MTBoLTMwek0xODAgNTBoMzB2MTBoLTMwem02MCAwaDEwdjgwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTMwIDBoNDB2MTBoLTQwek0xMCA2MGg1MHYxMEgxMHptOTAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2NTBoLTEwem00MCAwaDEwdjMwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MzBoLTEwem0yMCAwaDEwdjEwaC0xMHptNDAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjMwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjYwaC0xMHptMzAgMGg1MHYxMGgtNTB6TTkwIDcwaDEwdjEwSDkwem00MCAwaDEwdjEwaC0xMHptNjAgMGgxMHY3MGgtMTB6bTYwIDBoMTB2NjBoLTEwem00MCAwaDEwdjEwaC0xMHptNjAgMGgxMHYyMGgtMTB6TTEwIDgwaDcwdjEwSDEwem0xMzAgMGgyMHYxMGgtMjB6bTMwIDBoMjB2MTBoLTIwem00MCAwaDMwdjEwaC0zMHptNTAgMGgyMHYxMGgtMjB6bTEzMCAwaDIwdjEwaC0yMHptNTAgMGgxMHYyMGgtMTB6TTEwIDkwaDIwdjIwSDEwem00MCAwaDEwdjIwSDUwem0yMCAwaDEwdjEwSDcwem00MCAwaDEwdjcwaC0xMHptNDAgMGgxMHYyMGgtMTB6bTYwIDBoMjB2MTBoLTIwem03MCAwaDEwdjEwaC0xMHptMzAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MzBoLTEwem01MCAwaDEwdjEwaC0xMHptMjAgMGg0MHYxMGgtNDB6TTAgMTAwaDEwdjEwSDB6bTMwIDBoMTB2NzBIMzB6bTMwIDBoMTB2MTBINjB6bTIwIDBoMjB2MjBIODB6bTUwIDBoMjB2MTBoLTIwem0zMCAwaDIwdjEwaC0yMHptNDAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2NDBoLTEwem00MCAwaDIwdjEwaC0yMHptMzAgMGgyMHYyMGgtMjB6bTUwIDBoMjB2MTBoLTIwem03MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6TTEwIDExMGgxMHYxMEgxMHptMzAgMGgxMHYzMEg0MHptNjAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MTBoLTEwem00MCAwaDEwdjE5MGgtMTB6bTYwIDBoMTB2MzBoLTEwem05MCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptMzAgMGgxMHYzMGgtMTB6bTIwIDBoMTB2MTBoLTEwek0wIDEyMGgxMHYzMEgwem0yMCAwaDEwdjIwSDIwem00MCAwaDIwdjEwSDYwem05MCAwaDEwdjE4MGgtMTB6bTYwIDBoMTB2MjBoLTEwem04MCAwaDEwdjEwaC0xMHptOTAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjEwaC0xMHpNNzAgMTMwaDEwdjEwSDcwem0yMCAwaDEwdjEwSDkwem03MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxOTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNjAgMGgzMHYxMGgtMzB6bTQwIDBoMTB2NDBoLTEwem0yMCAwaDIwdjEwaC0yMHptMzAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2MTBoLTEwek0xMCAxNDBoMTB2MTBIMTB6bTUwIDBoMTB2MTBINjB6bTIwIDBoMTB2MTBIODB6bTIwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjIwaC0xMHptMTQwIDBoMTB2MTcwaC0xMHptMzAgMGgxMHYxOTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNDAgMGgxMHYyMGgtMTB6bTkwIDBoMTB2MTBoLTEwek0yMCAxNTBoMTB2MjBIMjB6bTIwIDBoMjB2MTBINDB6bTEyMCAwaDEwdjE1MGgtMTB6bTMwIDBoNzB2MTUwaC03MHptODAgMGgyMHYxNTBoLTIwem02MCAwaDEwdjIwaC0xMHptMzAgMGgyMHYxMGgtMjB6bTMwIDBoMjB2MTBoLTIwem0zMCAwaDEwdjEwaC0xMHpNMCAxNjBoMjB2MTBIMHptNTAgMGgyMHYxMEg1MHptOTAgMGgxMHYxMGgtMTB6bTE4MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTMwIDBoMTB2MzBoLTEwem0yMCAwaDEwdjIwaC0xMHptNDAgMGgxMHYxMGgtMTB6TTAgMTcwaDEwdjEwSDB6bTgwIDBoMTB2ODBIODB6bTMzMCAwaDIwdjEwaC0yMHpNMTAgMTgwaDIwdjIwSDEwem00MCAwaDIwdjEwSDUwem00MCAwaDEwdjEwSDkwem01MCAwaDEwdjEwaC0xMHptMTcwIDBoMTB2MzBoLTEwem00MCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTUwIDBoMTB2MTBoLTEwek0zMCAxOTBoMTB2MTBIMzB6bTIwIDBoMTB2MjBINTB6bTYwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjEwaC0xMHptMTcwIDBoMTB2NTBoLTEwem02MCAwaDEwdjYwaC0xMHptMzAgMGgyMHYyMGgtMjB6bTUwIDBoMTB2MjBoLTEwek0wIDIwMGgyMHYyMEgwem00MCAwaDEwdjUwSDQwem0yMCAwaDIwdjEwSDYwem02MCAwaDEwdjMwaC0xMHptMjAwIDBoMzB2MTBoLTMwem01MCAwaDIwdjEwaC0yMHpNMjAgMjEwaDEwdjIwSDIwem0xMTAgMGgxMHYxMGgtMTB6bTE5MCAwaDIwdjEwaC0yMHptODAgMGg0MHYxMGgtNDB6TTYwIDIyMGgxMHYxMEg2MHptMzAgMGgxMHY0MEg5MHptMjQwIDBoMzB2MTBoLTMwem01MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTIwIDBoMTB2MTBoLTEwek0wIDIzMGgxMHYzMEgwem0xMTAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MTBoLTEwem0xODAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MTBoLTEwem05MCAwaDEwdjEwaC0xMHpNMTAgMjQwaDIwdjEwSDEwem00MCAwaDMwdjEwSDUwem01MCAwaDEwdjIwaC0xMHptMjAgMGgxMHYyMGgtMTB6bTE5MCAwaDEwdjEwaC0xMHptMjAgMGgyMHYxMGgtMjB6bTQwIDBoMzB2MTBoLTMwem02MCAwaDEwdjQwaC0xMHpNMjAgMjUwaDEwdjEwSDIwem0zMCAwaDEwdjMwSDUwem02MCAwaDEwdjEwaC0xMHptMzAgMGgxMHYyMGgtMTB6bTE2MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2NDBoLTEwem0yMCAwaDIwdjEwaC0yMHptNDAgMGgyMHYzMGgtMjB6bTMwIDBoMTB2MTBoLTEwek00MCAyNjBoMTB2MzBINDB6bTIwIDBoMTB2MTBINjB6bTIwIDBoMTB2MTBIODB6bTUwIDBoMTB2NDBoLTEwem0xODAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MTBoLTEwem00MCAwaDEwdjEwaC0xMHpNMTAgMjcwaDMwdjEwSDEwem02MCAwaDEwdjEwSDcwem0yMCAwaDEwdjIwSDkwem0yMCAwaDIwdjEwaC0yMHptMjUwIDBoMjB2MjBoLTIwem04MCAwaDEwdjEwaC0xMHpNMTAgMjgwaDIwdjEwSDEwem01MCAwaDEwdjEwSDYwem00MCAwaDEwdjMwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTIxMCAwaDEwdjEwaC0xMHptNjAgMGgxMHYzMGgtMTB6bTIwIDBoMTB2MjBoLTEwek0yMCAyOTBoMTB2MTBIMjB6bTUwIDBoMjB2MTBINzB6bTcwIDBoMTB2MzBoLTEwem0xNzAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwek0xMCAzMDBoMTB2MTBIMTB6bTMwIDBoMzB2MTBINDB6bTQwIDBoMTB2MjBIODB6bTMwIDBoMjB2MTBoLTIwem0xMjAgMGgzMHYxMGgtMzB6bTQwIDBoMTB2NDBoLTEwem0zMCAwaDEwdjIwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTEwMCAwaDEwdjEwaC0xMHpNMCAzMTBoMTB2MzBIMHptMjAgMGgxMHYxMEgyMHptMjAgMGgyMHYxMEg0MHptNTAgMGgxMHYxMEg5MHptMzAgMGgyMHYxMGgtMjB6bTQwIDBoMjB2MjBoLTIwem0zMCAwaDIwdjEwaC0yMHptOTAgMGgxMHYxMGgtMTB6bTMwIDBoMjB2MTBoLTIwem00MCAwaDEwdjEwaC0xMHptMjAgMGgyMHYxMGgtMjB6bTQwIDBoMjB2MTBoLTIwek0xMCAzMjBoMTB2MjBIMTB6bTIwIDBoMTB2MTBIMzB6bTMwIDBoMjB2MTBINjB6bTE0MCAwaDIwdjMwaC0yMHptNjAgMGgxMHYzMGgtMTB6bTgwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNjAgMGgyMHYxMGgtMjB6TTQwIDMzMGgyMHYxMEg0MHptNDAgMGg0MHYxMEg4MHptNjAgMGgxMHY3MGgtMTB6bTMwIDBoMTB2MTBoLTEwem01MCAwaDIwdjEwaC0yMHptNjAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTQwIDBoNDB2MTBoLTQwem01MCAwaDEwdjEwaC0xMHpNNDAgMzQwaDEwdjMwSDQwem0yMCAwaDEwdjEwSDYwem0zMCAwaDMwdjEwSDkwem0xNDAgMGgzMHYxMGgtMzB6bTgwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjQwaC0xMHptNzAgMGgzMHYxMGgtMzB6TTEwIDM1MGgzMHYxMEgxMHptODAgMGgxMHYxMEg5MHptMjAgMGgzMHYxMGgtMzB6bTUwIDBoMzB2MTBoLTMwem00MCAwaDEwdjEwMGgtMTB6bTIwIDBoMzB2MjBoLTMwem01MCAwaDQwdjEwaC00MHptNTAgMGgxMHYzMGgtMTB6bTQwIDBoMTB2NjBoLTEwem01MCAwaDIwdjEwaC0yMHptMzAgMGgxMHYxMGgtMTB6TTAgMzYwaDEwdjEwSDB6bTMwIDBoMTB2MTBIMzB6bTMwIDBoMTB2MTBINjB6bTIwIDBoMTB2ODBIODB6bTIwIDBoMTB2MzBoLTEwem0yMCAwaDIwdjIwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTQwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjEwaC0xMHptNDAgMGgxMHYyMGgtMTB6bTIwIDBoMjB2MjBoLTIwem0zMCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwem0yMCAwaDQwdjEwaC00MHptNTAgMGgyMHYxMGgtMjB6TTkwIDM3MGgxMHYyMEg5MHptMjAgMGgxMHY0MGgtMTB6bTEzMCAwaDEwdjcwaC0xMHptMjAgMGgxMHY1MGgtMTB6bTMwIDBoMTB2MTBoLTEwem0xMTAgMGgzMHYxMGgtMzB6bTQwIDBoMTB2MTBoLTEwek0wIDM4MGg3MHYxMEgwem0xMzAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MzBoLTEwem02MCAwaDEwdjEwaC0xMHptODAgMGgyMHYyMGgtMjB6bTMwIDBoMTB2MzBoLTEwem01MCAwaDEwdjEwaC0xMHptMjAgMGgxMHY0MGgtMTB6bTIwIDBoMTB2MTBoLTEwek0wIDM5MGgxMHY2MEgwem02MCAwaDEwdjYwSDYwem02MCAwaDEwdjMwaC0xMHptMzAgMGgxMHYyMGgtMTB6bTQwIDBoMTB2MzBoLTEwem02MCAwaDEwdjMwaC0xMHptMjAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MjBoLTEwem02MCAwaDEwdjEwaC0xMHptODAgMGgyMHYxMGgtMjB6TTIwIDQwMGgzMHYzMEgyMHptNzAgMGgxMHY0MEg5MHptOTAgMGgxMHY0MGgtMTB6bTMwIDBoMzB2MTBoLTMwem05MCAwaDEwdjEwaC0xMHptNDAgMGgxMHYzMGgtMTB6bTMwIDBoMzB2MTBoLTMwem0tMjMwIDEwaDEwdjMwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTExMCAwaDEwdjEwaC0xMHptMzAgMGgyMHYxMGgtMjB6bTYwIDBoMTB2MjBoLTEwem00MCAwaDMwdjEwaC0zMHptLTMxMCAxMGgyMHYxMGgtMjB6bTUwIDBoMjB2MTBoLTIwem0xMjAgMGgxMHYyMGgtMTB6bTMwIDBoMjB2MTBoLTIwem02MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTQwIDBoMTB2MTBoLTEwem0tMzEwIDEwaDIwdjEwaC0yMHptNDAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MjBoLTEwem00MCAwaDEwdjEwaC0xMHptODAgMGgxMHYxMGgtMTB6bTIwIDBoMjB2MjBoLTIwem00MCAwaDEwdjIwaC0xMHptNTAgMGgxMHYxMGgtMTB6bTMwIDBoMjB2MTBoLTIwek0xMCA0NDBoNTB2MTBIMTB6bTkwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptNDAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MTBoLTEwem00MCAwaDEwdjEwaC0xMHptMjAgMGgyMHYxMGgtMjB6bTMwIDBoMTB2MTBoLTEwem01MCAwaDIwdjEwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTcwIDBoMTB2MTBoLTEweiIvPgo8L3N2Zz4K" style="width:240px;height:240px;display:block;margin-bottom:16px">
<div style="margin-bottom:4px;font-size:13px;font-weight:bold;color:#555">支付宝</div>
<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MTAiIGhlaWdodD0iNDEwIiBzaGFwZS1yZW5kZXJpbmc9ImNyaXNwRWRnZXMiIHZpZXdCb3g9IjAgMCA0MTAgNDEwIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+CiAgPHBhdGggZD0iTTAgMGg3MHYxMEgwem05MCAwaDIwdjEwSDkwem00MCAwaDcwdjEwaC03MHptODAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem01MCAwaDIwdjEwaC0yMHptNjAgMGg3MHYxMGgtNzB6TTAgMTBoMTB2NjBIMHptNjAgMGgxMHY2MEg2MHptODAgMGgyMHYxMGgtMjB6bTMwIDBoMzB2MTBoLTMwem0xMzAgMGgzMHYxMGgtMzB6bTQwIDBoMTB2NjBoLTEwem02MCAwaDEwdjYwaC0xMHpNMjAgMjBoMzB2MzBIMjB6bTYwIDBoMjB2MjBIODB6bTQwIDBoMjB2MTBoLTIwem0zMCAwaDEwdjMwaC0xMHptMjAgMGgyMHYxMGgtMjB6bTMwIDBoMjB2MTBoLTIwem0zMCAwaDIwdjEwaC0yMHptNDAgMGgxMHYxMGgtMTB6bTQwIDBoMjB2MTBoLTIwem01MCAwaDMwdjMwaC0zMHpNMTEwIDMwaDEwdjIwaC0xMHptNzAgMGgzMHYxMGgtMzB6bTQwIDBoMjB2MTBoLTIwem04MCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6TTEwMCA0MGgxMHYzMGgtMTB6bTMwIDBoMjB2MTBoLTIwem00MCAwaDMwdjEwaC0zMHptNjAgMGg0MHYxMGgtNDB6bTYwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjEwaC0xMHpNOTAgNTBoMTB2MTBIOTB6bTQwIDBoMTB2MTBoLTEwem0zMCAwaDIwdjEwaC0yMHptMzAgMGgzMHYxMGgtMzB6bTQwIDBoMzB2MTBoLTMwem01MCAwaDEwdjQwaC0xMHptMjAgMGgxMHYyMGgtMTB6TTEwIDYwaDUwdjEwSDEwem03MCAwaDEwdjEwSDgwem00MCAwaDEwdjMwaC0xMHptMjAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjQwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjQwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTYwIDBoMTB2MTBoLTEwem0zMCAwaDUwdjEwaC01MHpNMTEwIDcwaDEwdjIwaC0xMHptODAgMGgxMHY0MGgtMTB6bTIwIDBoMTB2MTBoLTEwem00MCAwaDEwdjEwaC0xMHpNMzAgODBoMjB2MTBIMzB6bTMwIDBoMjB2MTBINjB6bTMwIDBoMTB2NDBIOTB6bTYwIDBoMzB2MTBoLTMwem03MCAwaDEwdjEwaC0xMHptNDAgMGgyMHYxMGgtMjB6bTMwIDBoMTB2MjBoLTEwem0yMCAwaDIwdjEwaC0yMHptNjAgMGgyMHYxMGgtMjB6TTIwIDkwaDEwdjIwSDIwem0yMCAwaDEwdjEwSDQwem0xMDAgMGgyMHYzMGgtMjB6bTMwIDBoMTB2MTBoLTEwem0zMCAwaDEwdjIwaC0xMHptNTAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwem00MCAwaDEwdjEwaC0xMHptNDAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2MTBoLTEwek0xMCAxMDBoMTB2MjBIMTB6bTIwIDBoMTB2MjBIMzB6bTIwIDBoMjB2MTBINTB6bTMwIDBoMTB2NDBIODB6bTMwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTcwIDBoMTB2MTBoLTEwem03MCAwaDEwdjEwaC0xMHptMzAgMGgxMHY4MGgtMTB6bTMwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHpNNDAgMTEwaDIwdjEwSDQwem04MCAwaDEwdjEwaC0xMHptNTAgMGgxMHYyMGgtMTB6bTQwIDBoMTB2NTBoLTEwem00MCAwaDIwdjEwaC0yMHptNDAgMGgxMHYxMGgtMTB6bTIwIDBoMjB2MTBoLTIwem0zMCAwaDIwdjIwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2NTBoLTEwek02MCAxMjBoMjB2MTBINjB6bTQwIDBoMjB2MTBoLTIwem01MCAwaDIwdjEwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTQwIDBoMjB2MTBoLTIwem00MCAwaDEwdjEwaC0xMHptNjAgMGgxMHYxMGgtMTB6bTcwIDBoMTB2MTBoLTEwek0yMCAxMzBoMzB2MTBIMjB6bTUwIDBoMTB2MzBINzB6bTIwIDBoMTB2MzBIOTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptMzAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MTBoLTEwem0zMCAwaDEwdjEwaC0xMHptNzAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MTBoLTEwem00MCAwaDQwdjEwaC00MHpNMzAgMTQwaDIwdjEwSDMwem0zMCAwaDEwdjEwSDYwem02MCAwaDIwdjIwaC0yMHptNTAgMGgyMHYxMGgtMjB6bTcwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptNDAgMGgxMHYyMGgtMTB6bTQwIDBoMjB2MTBoLTIwek0wIDE1MGgxMHYxMEgwem0yMCAwaDEwdjIwSDIwem02MCAwaDEwdjIwSDgwem0yMCAwaDIwdjEwaC0yMHptNTAgMGgxMHYzMGgtMTB6bTIwIDBoMTB2OTBoLTEwem0yMCAwaDIwdjEwaC0yMHptMzAgMGgyMHYxMGgtMjB6bTQwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjIwaC0xMHptMzAgMGgxMHY1MGgtMTB6bTUwIDBoNDB2MTBoLTQwek0xMCAxNjBoMTB2NDBIMTB6bTIwIDBoMTB2MzBIMzB6bTMwIDBoMTB2MTBINjB6bTUwIDBoMTB2MjBoLTEwem01MCAwaDEwdjEwaC0xMHptMzAgMGgxMHY4MGgtMTB6bTMwIDBoMTB2OTBoLTEwem0zMCAwaDEwdjYwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTEwMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6TTAgMTcwaDEwdjEwSDB6bTQwIDBoMjB2MjBINDB6bTgwIDBoMzB2MTBoLTMwem02MCAwaDEwdjExMGgtMTB6bTIwIDBoMjB2ODBoLTIwem0zMCAwaDIwdjMwaC0yMHptMzAgMGgxMHYzMGgtMTB6bTQwIDBoMTB2MTBoLTEwem02MCAwaDEwdjQwaC0xMHptMjAgMGgxMHYxMGgtMTB6TTIwIDE4MGgxMHYxMEgyMHptNDAgMGg1MHYxMEg2MHptMTAwIDBoMTB2MzBoLTEwem0xMjAgMGgxMHYyMGgtMTB6bTQwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MTBoLTEwek0wIDE5MGgxMHY2MEgwem00MCAwaDEwdjEwSDQwem03MCAwaDEwdjEwaC0xMHptMjAgMGgzMHYxMGgtMzB6bTE2MCAwaDIwdjEwaC0yMHptNDAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2MjBoLTEwek0yMCAyMDBoMjB2MjBIMjB6bTMwIDBoMjB2MTBINTB6bTMwIDBoMTB2MjBIODB6bTIwIDBoMTB2MzBoLTEwem0yMCAwaDEwdjIwaC0xMHptMzAgMGgxMHYyMGgtMTB6bTgwIDBoMTB2NDBoLTEwem00MCAwaDEwdjcwaC0xMHptNzAgMGgxMHYxMGgtMTB6bTUwIDBoMjB2MTBoLTIwek0xMCAyMTBoMTB2MTBIMTB6bTMwIDBoMjB2MTBINDB6bTkwIDBoMjB2MjBoLTIwem0xMTAgMGgxMHYxMGgtMTB6bTQwIDBoMTB2MTBoLTEwem0yMCAwaDIwdjEwaC0yMHptNTAgMGgxMHYyMGgtMTB6bTIwIDBoMTB2MTBoLTEwek0zMCAyMjBoMTB2MTBIMzB6bTMwIDBoMTB2MTBINjB6bTMwIDBoMTB2NDBIOTB6bTcwIDBoMTB2MjBoLTEwem0xNDAgMGgxMHY3MGgtMTB6bTQwIDBoMTB2NDBoLTEwek03MCAyMzBoMTB2MTBINzB6bTUwIDBoMjB2MTBoLTIwem0xMjAgMGgzMHYxMGgtMzB6bTUwIDBoMTB2MTBoLTEwem0yMCAwaDMwdjEwaC0zMHptNjAgMGg0MHYxMGgtNDB6TTIwIDI0MGgyMHYxMEgyMHptMzAgMGgyMHYxMEg1MHptMzAgMGgxMHYxMEg4MHptNDAgMGgxMHYxMGgtMTB6bTMwIDBoMTB2MTBoLTEwem0xMzAgMGgxMHYyMGgtMTB6bTQwIDBoMTB2MzBoLTEwem0zMCAwaDEwdjIwaC0xMHptMjAgMGgyMHYxMGgtMjB6TTEwIDI1MGgxMHYxMEgxMHptMjAgMGgyMHYxMEgzMHptNzAgMGgyMHYxMGgtMjB6bTEzMCAwaDIwdjIwaC0yMHptNjAgMGgxMHYxMGgtMTB6bTcwIDBoMTB2MTBoLTEwem0yMCAwaDMwdjEwaC0zMHpNNTAgMjYwaDIwdjEwSDUwem05MCAwaDEwdjIwaC0xMHptODAgMGgxMHYyMGgtMTB6bTMwIDBoMjB2MTBoLTIwem02MCAwaDEwdjMwaC0xMHptNjAgMGgxMHYzMGgtMTB6bTIwIDBoMjB2MTBoLTIwek0wIDI3MGgzMHYxMEgwem00MCAwaDIwdjEwSDQwem02MCAwaDEwdjEwaC0xMHptOTAgMGgxMHY3MGgtMTB6bTIwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjIwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem03MCAwaDIwdjEwaC0yMHptMzAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwek0wIDI4MGgxMHY1MEgwem00MCAwaDEwdjEwSDQwem0yMCAwaDIwdjEwSDYwem0zMCAwaDEwdjEwSDkwem0yMCAwaDMwdjEwaC0zMHptNDAgMGgzMHYyMGgtMzB6bTkwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjEwaC0xMHptNzAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2NDBoLTEwek0zMCAyOTBoMTB2MTBIMzB6bTIwIDBoMTB2MTBINTB6bTIwIDBoMTB2NDBINzB6bTMwIDBoMjB2MTBoLTIwem00MCAwaDEwdjIwaC0xMHptNjAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwem0zMCAwaDIwdjMwaC0yMHptOTAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjUwaC0xMHpNMTAgMzAwaDEwdjMwSDEwem01MCAwaDEwdjEwSDYwem0yMCAwaDIwdjEwSDgwem0zMCAwaDEwdjIwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTUwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjIwaC0xMHptNzAgMGgyMHYxMGgtMjB6bTMwIDBoMTB2NTBoLTEwem0yMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTUwIDBoMTB2MzBoLTEwek00MCAzMTBoMjB2MTBINDB6bTQwIDBoMTB2MTBIODB6bTIwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjIwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTUwIDBoMTB2MTBoLTEwem0zMCAwaDIwdjEwaC0yMHptNDAgMGgyMHYxMGgtMjB6bTUwIDBoMTB2ODBoLTEwem0yMCAwaDEwdjIwaC0xMHptMzAgMGgxMHY3MGgtMTB6TTQwIDMyMGgxMHYxMEg0MHptMjAgMGgxMHYxMEg2MHptMzAgMGgxMHYxMEg5MHptMTMwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYzMGgtMTB6bTIwIDBoMjB2MTBoLTIwem01MCAwaDEwdjEwaC0xMHptMzAgMGgxMHY1MGgtMTB6TTgwIDMzMGgxMHYyMEg4MHptNjAgMGgyMHYxMGgtMjB6bTMwIDBoMTB2MjBoLTEwem0zMCAwaDIwdjIwaC0yMHptMzAgMGgxMHY1MGgtMTB6bTQwIDBoMTB2MzBoLTEwem0zMCAwaDEwdjIwaC0xMHptOTAgMGgxMHYxMGgtMTB6TTAgMzQwaDcwdjEwSDB6bTEwMCAwaDQwdjEwaC00MHptNTAgMGgxMHYyMGgtMTB6bTMwIDBoMTB2MTBoLTEwem00MCAwaDEwdjEwaC0xMHptMzAgMGgxMHYxMGgtMTB6bTMwIDBoMjB2MTBoLTIwem02MCAwaDEwdjEwaC0xMHpNMCAzNTBoMTB2NjBIMHptNjAgMGgxMHY2MEg2MHptNTAgMGgyMHYxMGgtMjB6bTMwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjIwaC0xMHptNDAgMGgxMHYyMGgtMTB6bTkwIDBoMTB2NDBoLTEwem0xMDAgMGgyMHYxMGgtMjB6TTIwIDM2MGgzMHYzMEgyMHptNjAgMGgzMHYxMEg4MHptNTAgMGgxMHY0MGgtMTB6bTUwIDBoMjB2MTBoLTIwem00MCAwaDEwdjIwaC0xMHptMzAgMGgyMHYxMGgtMjB6bTUwIDBoMjB2MTBoLTIwem0zMCAwaDMwdjEwaC0zMHptNjAgMGgxMHYxMGgtMTB6TTgwIDM3MGgxMHYxMEg4MHptNzAgMGgxMHYxMGgtMTB6bTQwIDBoMTB2MTBoLTEwem01MCAwaDEwdjEwaC0xMHptMjAgMGgyMHYyMGgtMjB6bTkwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYzMGgtMTB6bS0zMDAgMTBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNTAgMGgxMHYxMGgtMTB6bTMwIDBoMjB2MTBoLTIwem01MCAwaDEwdjEwaC0xMHptNjAgMGgxMHYxMGgtMTB6bTIwIDBoMTB2MjBoLTEwem0zMCAwaDEwdjMwaC0xMHptMzAgMGgxMHYxMGgtMTB6bS0yODAgMTBoMTB2MTBoLTEwem0zMCAwaDMwdjIwaC0zMHptNTAgMGgxMHYxMGgtMTB6bTcwIDBoMTB2MjBoLTEwem0yMCAwaDEwdjEwaC0xMHptMjAgMGgxMHYxMGgtMTB6bTgwIDBoMTB2MjBoLTEwek0xMCA0MDBoNTB2MTBIMTB6bTE2MCAwaDEwdjEwaC0xMHptMzAgMGgzMHYxMGgtMzB6bTUwIDBoMTB2MTBoLTEwem0yMCAwaDEwdjEwaC0xMHptNTAgMGgxMHYxMGgtMTB6bTUwIDBoMTB2MTBoLTEweiIvPgo8L3N2Zz4K" style="width:240px;height:240px;display:block">
</div>
<div id="vc-page5" style="display:none"><div class="vc-row">
  <div class="vc-part">
    <div style="font-weight:bold;font-size:13px;color:#444;margin-bottom:5px;height:28px;line-height:28px">B站</div>
    <div class="vc-item"><span class="vc-lbl">总进度</span><span class="vc-num"></span><span class="vc-ctl"><span class="vc-dual" id="vc-biliProgressEnabled" data-color="yellow" data-value="${s.biliProgressEnabled ? '1' : '0'}" style="display:flex;gap:0;width:100%;max-width:180px"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.biliProgressEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.biliProgressEnabled ? '#ffd54f' : '#fff3cd'};color:${s.biliProgressEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.biliProgressEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.biliProgressEnabled ? '#fff3cd' : '#ffd54f'};color:${s.biliProgressEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
    <div class="vc-item"><span class="vc-lbl">自动切集</span><span class="vc-num"></span><span class="vc-ctl"><span id="vc-autoNextEnabled" data-value="${s.autoNextEnabled ? '1' : '0'}" class="vc-dual" style="display:flex;gap:0;width:100%;max-width:180px" data-color="yellow"><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoNextEnabled ? '#ff9800' : '#ffb300'};border-radius:4px 0 0 4px;background:${s.autoNextEnabled ? '#ffd54f' : '#fff3cd'};color:${s.autoNextEnabled ? '#3e2723' : '#5d4037'};cursor:pointer;font-size:13px;flex:1">开启</button><button type="button" style="padding:0;line-height:25px;border:1px solid ${s.autoNextEnabled ? '#ffb300' : '#ff9800'};border-left:none;border-radius:0 4px 4px 0;background:${s.autoNextEnabled ? '#fff3cd' : '#ffd54f'};color:${s.autoNextEnabled ? '#5d4037' : '#3e2723'};cursor:pointer;font-size:13px;flex:1">关闭</button></span></span></div>
  </div>
  <div class="vc-part">
  </div>
</div></div></div>
<div style="display:flex;gap:12px;margin-top:8px">
  <span style="display:flex;flex:1;min-width:0">
    <button id="vc-pg1" style="flex:1;padding:6px 0;min-width:0;border:1px solid #64b5f6;border-right:none;border-top:none;border-radius:0 0 0 6px;background:#90caf9;color:#0d47a1;cursor:pointer;font-size:13px;text-align:center;position:relative;z-index:1">基础</button>
    <button id="vc-pg2" style="flex:1;padding:6px 0;min-width:0;border:1px solid #90caf9;border-right:none;border-left:none;border-top:none;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px;text-align:center;position:relative">工具</button>
    <button id="vc-pg3" style="flex:1;padding:6px 0;min-width:0;border:1px solid #90caf9;border-right:none;border-left:none;border-top:none;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px;text-align:center;position:relative">自动</button>
    <button id="vc-pg5" style="flex:1;padding:6px 0;min-width:0;border:1px solid #90caf9;border-right:none;border-left:none;border-top:none;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px;text-align:center;position:relative">站点</button>
    <button id="vc-pg4" style="flex:1;padding:6px 0;min-width:0;border:1px solid #90caf9;border-left:none;border-top:none;border-radius:0 0 6px 0;background:#e3f2fd;color:#1565c0;cursor:pointer;font-size:13px;text-align:center;position:relative">关于</button>
  </span>
  <span style="flex:1;min-width:0;display:flex;justify-content:flex-end;gap:8px">
    <button class="vc-btn vc-btn-reset" id="vc-reset">恢复默认</button>
    <button class="vc-btn vc-btn-save" id="vc-save">保存</button>
    <button class="vc-btn vc-btn-cancel" id="vc-cancel">取消</button>
  </span>
</div>`;
    }

    function bindSettingsEvents(panel) {
        var pages = [panel.querySelector('#vc-page1'), panel.querySelector('#vc-page2'), panel.querySelector('#vc-page3'), panel.querySelector('#vc-page5'), panel.querySelector('#vc-page4')];
        var btns = [panel.querySelector('#vc-pg1'), panel.querySelector('#vc-pg2'), panel.querySelector('#vc-pg3'), panel.querySelector('#vc-pg5'), panel.querySelector('#vc-pg4')];
        var initPage = settings.lastTab || 0;
        pages.forEach(function(p,i) { p.style.display = i === initPage ? '' : 'none'; });
        function setTabStyle(act) {
            btns.forEach(function(b,i) {
                b.style.background = i === act ? '#90caf9' : '#e3f2fd';
                b.style.borderTop = i === act ? 'none' : '1px solid #90caf9';
                b.style.borderLeft = b.style.borderRight = b.style.borderBottom = i === act ? '1px solid #64b5f6' : '1px solid #90caf9';
                b.style.color = i === act ? '#0d47a1' : '#1565c0';
                b.style.zIndex = i === act ? '1' : '0';
                b.style.borderRadius = i === 0 ? '0 0 0 6px' : i === pages.length - 1 ? '0 0 6px 0' : '0';
            });
        }
        setTabStyle(initPage);
        panel.style.visibility = 'hidden';
        requestAnimationFrame(function() {
            var prev = initPage;
            if (prev !== 0) { pages.forEach(function(p,i) { p.style.display = i === 0 ? '' : 'none'; }); }
            requestAnimationFrame(function() {
                var c = panel.querySelector('#vc-content');
                c.style.minHeight = c.scrollHeight + 'px';
                c.style.maxHeight = c.scrollHeight + 'px';
                if (prev !== 0) { pages.forEach(function(p,i) { p.style.display = i === prev ? '' : 'none'; }); }
                panel.style.visibility = '';
            });
        });
        function switchPage(act) {
            settings.lastTab = act;
            pages.forEach(function(p,i) { p.style.display = i === act ? '' : 'none'; });
            panel.querySelector('#vc-content').scrollTop = 0;
            setTabStyle(act);
        }
        btns.forEach(function(b,i) { b.onclick = function() { switchPage(i); }; });

        function getVid() { return getActiveVideo(); }

        const keyInputs = panel.querySelectorAll('.vc-key-input');
        keyInputs.forEach(function (input) {
            input.addEventListener('focus', function () { input.value = ''; });
            input.addEventListener('keydown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (['Control','Alt','Shift','Meta'].indexOf(e.key) >= 0) return;
                var k = e.key === ' ' ? 'Space' : e.key;
                if (e.ctrlKey) k = 'Ctrl+' + k;
                if (e.altKey) k = 'Alt+' + k;
                var all = panel.querySelectorAll('.vc-key-input');
                for (var x = 0; x < all.length; x++) {
                    if (all[x] !== input && all[x].value === k) { all[x].value = ''; }
                }
                input.value = k;
                input.blur();
            });
        });

        panel.querySelectorAll('.vc-dual').forEach(function(dual) {
            var btns = dual.querySelectorAll('button');
            var y = dual.dataset.color === 'yellow';
            var acBg = y ? '#ffd54f' : '#90caf9', acColor = y ? '#3e2723' : '#0d47a1', acBd = y ? '#ff9800' : '#64b5f6';
            var inBg = y ? '#fff3cd' : '#e3f2fd', inColor = y ? '#5d4037' : '#1565c0', inBd = y ? '#ffb300' : '#90caf9';
            btns.forEach(function(btn, i) {
                btn.addEventListener('click', function() {
                    dual.dataset.value = (i === 0 ? '1' : '0');
                    btns.forEach(function(b, j) {
                        var act = j === i;
                        b.style.background = act ? acBg : inBg;
                        b.style.color = act ? acColor : inColor;
                        b.style.borderColor = act ? acBd : inBd;
                    });
                });
            });
        });

        (function() {
            panel.querySelector('#vc-noMemorySites').value = settings.noMemorySites || '';
        })();

        panel.querySelector('#vc-addNomemory').addEventListener('click', function() {
            var ta = panel.querySelector('#vc-noMemorySites');
            var host = getCurrentSite();
            var lines = ta.value.split('\n');
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].trim() === host) return;
            }
            ta.value = ta.value ? ta.value + '\n' + host : host;
        });

        (function() {
            var bR = panel.querySelector('#vc-cb-r');
            var cR = panel.querySelector('#vc-cc-r');
            var sR = panel.querySelector('#vc-cs-r');
            var hR = panel.querySelector('#vc-ch-r');
            var bV = panel.querySelector('#vc-cb-v');
            var cV = panel.querySelector('#vc-cc-v');
            var sV = panel.querySelector('#vc-cs-v');
            var hV = panel.querySelector('#vc-ch-v');
            var preset = panel.querySelector('#vc-preset');

            function updateLabels() {
                bV.textContent = bR.value + '%';
                cV.textContent = cR.value + '%';
                sV.textContent = sR.value + '%';
                hV.textContent = hR.value + '°';
            }

            function applyColor() {
                var v = getVid();
                if (!v) return;
                var bv = bR.value / 100, cv = cR.value / 100, sv = sR.value / 100, hv = hR.value;
                v.style.filter = 'brightness('+bv+') contrast('+cv+') saturate('+sv+') hue-rotate('+hv+'deg)';
                v._vcBrightness = bv;
                updateLabels();
                if (!preset._lock) preset.value = '自定义';
            }

            function stepColor(r, d) { r.value = +r.value + d; applyColor(); }

            function loadFromVideo() {
                var v = getVid();
                if (!v) return;
                var f = v.style.filter || '';
                var b = (f.match(/brightness\(([^)]+)\)/) || [0,1])[1];
                var c = (f.match(/contrast\(([^)]+)\)/) || [0,1])[1];
                var s = (f.match(/saturate\(([^)]+)\)/) || [0,1])[1];
                var h = (f.match(/hue-rotate\(([^)]+)deg\)/) || [0,0])[1];
                bR.value = Math.round(b * 100);
                cR.value = Math.round(c * 100);
                sR.value = Math.round(s * 100);
                hR.value = Math.round(h);
                updateLabels();
                var f = v.style.filter || '';
                if (!f) { preset.value = '默认'; }
                else {
                    var bv = Math.round(parseFloat((f.match(/brightness\(([^)]+)\)/) || [0,1])[1]) * 100);
                    var cv = Math.round(parseFloat((f.match(/contrast\(([^)]+)\)/) || [0,1])[1]) * 100);
                    var sv = Math.round(parseFloat((f.match(/saturate\(([^)]+)\)/) || [0,1])[1]) * 100);
                    var hv = Math.round(parseFloat((f.match(/hue-rotate\(([^)]+)deg\)/) || [0,0])[1]));
                    var matched = false;
                    var keys = Object.keys(COLOR_PRESETS);
                    for (var ki = 0; ki < keys.length; ki++) {
                        var p = COLOR_PRESETS[keys[ki]];
                        var pb = Math.round(parseFloat((p.match(/brightness\(([^)]+)\)/) || [0,1])[1]) * 100);
                        var pc = Math.round(parseFloat((p.match(/contrast\(([^)]+)\)/) || [0,1])[1]) * 100);
                        var ps = Math.round(parseFloat((p.match(/saturate\(([^)]+)\)/) || [0,1])[1]) * 100);
                        var ph = Math.round(parseFloat((p.match(/hue-rotate\(([^)]+)deg\)/) || [0,0])[1]));
                        if (bv === pb && cv === pc && sv === ps && hv === ph) { matched = true; preset.value = keys[ki]; break; }
                    }
                    if (!matched) preset.value = '自定义';
                }
            }

            bR.oninput = applyColor;
            cR.oninput = applyColor;
            sR.oninput = applyColor;
            hR.oninput = applyColor;

            panel.querySelector('#vc-cb-m').onclick = function() { stepColor(bR, -1); };
            panel.querySelector('#vc-cb-p').onclick = function() { stepColor(bR, 1); };
            panel.querySelector('#vc-cc-m').onclick = function() { stepColor(cR, -1); };
            panel.querySelector('#vc-cc-p').onclick = function() { stepColor(cR, 1); };
            panel.querySelector('#vc-cs-m').onclick = function() { stepColor(sR, -1); };
            panel.querySelector('#vc-cs-p').onclick = function() { stepColor(sR, 1); };
            panel.querySelector('#vc-ch-m').onclick = function() { stepColor(hR, -1); };
            panel.querySelector('#vc-ch-p').onclick = function() { stepColor(hR, 1); };

            preset.addEventListener('change', function() {
                preset._lock = true;
                var filter = COLOR_PRESETS[this.value];
                if (!filter) { preset._lock = false; return; }
                var v = getVid();
                if (v) {
                    v.style.filter = filter;
                    v._vcBrightness = parseFloat((filter.match(/brightness\(([^)]+)\)/) || [0,1])[1]);
                }
                var b = (filter.match(/brightness\(([^)]+)\)/) || [0,1])[1];
                var c = (filter.match(/contrast\(([^)]+)\)/) || [0,1])[1];
                var s = (filter.match(/saturate\(([^)]+)\)/) || [0,1])[1];
                var h = (filter.match(/hue-rotate\(([^)]+)deg\)/) || [0,0])[1];
                bR.value = Math.round(b * 100);
                cR.value = Math.round(c * 100);
                sR.value = Math.round(s * 100);
                hR.value = Math.round(h);
                updateLabels();
                preset._lock = false;
            });

            loadFromVideo();
        })();

        (function() {
            var ls = panel.querySelector('#vc-ls');
            var le = panel.querySelector('#vc-le');
            var lc = panel.querySelector('#vc-lc');
            var dual = panel.querySelector('#vc-loop-toggle');

            function updateDualBtn(act) {
                var btns = dual.querySelectorAll('button');
                btns[0].style.background = act ? '#90caf9' : '#e3f2fd';
                btns[0].style.color = act ? '#0d47a1' : '#1565c0';
                btns[0].style.borderColor = act ? '#64b5f6' : '#90caf9';
                btns[1].style.background = act ? '#e3f2fd' : '#90caf9';
                btns[1].style.color = act ? '#1565c0' : '#0d47a1';
                btns[1].style.borderColor = act ? '#90caf9' : '#64b5f6';
            }

            var fm = function(sec) {
                if (isNaN(sec) || sec < 0) sec = 0;
                var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
                var ss = s === Math.floor(s) ? String(Math.floor(s)) : s.toFixed(1);
                return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
            };

            var parseTime = function(v) {
                v = v.trim();
                if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
                var m = v.split(':');
                if (m.length === 2) return parseInt(m[0]) * 60 + parseFloat(m[1]);
                if (m.length >= 3) return parseInt(m[0]) * 3600 + parseInt(m[1]) * 60 + parseFloat(m[2]);
                return 0;
            };

            function updateBtn() {
                var v = getVid();
                updateDualBtn(v && v._vcLoop);
            }

            function loadLoop() {
                var v = getVid();
                var loop = (v && v._vcLoop) ? v._vcLoop : { start: 0, end: 0, count: 1 };
                ls.value = fm(loop.start);
                le.value = fm(loop.end);
                lc.value = loop.count;
                updateBtn();
            }

            ls.onblur = function() { ls.value = fm(parseTime(ls.value)); };
            le.onblur = function() { le.value = fm(parseTime(le.value)); };

            dual.querySelectorAll('button')[0].addEventListener('click', function() {
                var v = getVid();
                if (!v) return;
                var total = v.duration || 1e9;
                ls.value = fm(parseTime(ls.value));
                le.value = fm(parseTime(le.value));
                var st = Math.max(0, Math.min(total, parseTime(ls.value)));
                var et = Math.max(0, Math.min(total, parseTime(le.value)));
                var cnt = Math.max(0, parseInt(lc.value) || 0);
                if (et <= st) { Toast('结束时间必须大于起始时间'); dual.dataset.value = '0'; updateDualBtn(false); return; }
                v._vcLoop = { start: st, end: et, count: cnt, cur: 0 };
                if (!v._vcLoopBound) { v._vcLoopBound = true; v.addEventListener('timeupdate', checkLoop); }
                Toast('区间循环已启用');
            });

            dual.querySelectorAll('button')[1].addEventListener('click', function() {
                var v = getVid();
                if (!v) return;
                if (v._vcLoop) {
                    v._vcLoop = null;
                    if (v._vcLoopBound) { v.removeEventListener('timeupdate', checkLoop); v._vcLoopBound = false; }
                    Toast('区间循环已取消');
                }
            });

            loadLoop();
        })();

        panel.querySelector('#vc-save').addEventListener('click', function () {
            applySettingsFromPanel(panel);
            var noList = (settings.noMemorySites || '').split('\n');
            for (var ni = 0; ni < noList.length; ni++) {
                var h = noList[ni].trim();
                if (h) removeSiteAuto(h);
            }
            saveSettings();
            (function() {
                var bpEl = document.getElementById('vc-bili-progress');
                if (settings.biliProgressEnabled) {
                    if (!bpEl && location.hostname === 'www.bilibili.com' && !biliProgress.timer) {
                        biliProgress.timer = setInterval(function() {
                            if (document.querySelector('.bpx-player-ctrl-time-label')) {
                                clearInterval(biliProgress.timer);
                                biliProgress.timer = null;
                                biliProgress.setup();
                            }
                        }, 500);
                    }
                } else {
                    if (bpEl) { bpEl.remove(); biliProgress.el = null; biliProgress.data = null; }
                    if (biliProgress.updateInterval) { clearInterval(biliProgress.updateInterval); biliProgress.updateInterval = null; }
                }
            })();
            injectNextUI();
            setupAutoNext(_webAutoNextDisabled ? 'off' : getNextMode());
            initFav();
            document.removeEventListener('keydown', onEsc);
            panel.remove();
            Toast(settings.hideMenuEntry ? '设置已保存，刷新页面后生效' : '设置已保存，立即生效');
            bindAllVideos();
        });

        panel.querySelector('#vc-cancel').addEventListener('click', function () {
            document.removeEventListener('keydown', onEsc);
            panel.remove();
        });

        panel.querySelector('#vc-reset').addEventListener('click', function () {
            settings = { ...DEFAULT_SETTINGS };
            saveSettings();
            document.removeEventListener('keydown', onEsc);
            panel.remove();
            Toast('已恢复默认设置');
            bindAllVideos();
        });

        function onEsc(e) {
            if (e.key === 'Escape') {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.classList.contains('vc-key-input')) return;
                panel.remove();
                document.removeEventListener('keydown', onEsc);
            }
        }
        document.addEventListener('keydown', onEsc);
    }

    function applySettingsFromPanel(panel) {
        const getVal = (id) => panel.querySelector('#' + id).value.trim();
        const getNum = (id) => parseFloat(panel.querySelector('#' + id).value);
        const getKey = (id) => {
            let v = getVal(id);
            if (v === '') return '';
            if (v === 'Space') return ' ';
            return v;
        };
        const getBool = (id) => {
            var el = panel.querySelector('#' + id);
            return !!(el && el.dataset.value === '1');
        };

        settings.togglePlay = getKey('vc-togglePlay');
        settings.speedUp = getKey('vc-speedUp');
        settings.speedDown = getKey('vc-speedDown');
        settings.forward = getKey('vc-forward');
        settings.backward = getKey('vc-backward');
        settings.frameForward = getKey('vc-frameForward');
        settings.frameBackward = getKey('vc-frameBackward');
        settings.volumeUp = getKey('vc-volumeUp');
        settings.volumeDown = getKey('vc-volumeDown');
        settings.brightnessUp = getKey('vc-brightnessUp');
        settings.brightnessDown = getKey('vc-brightnessDown');
        settings.fullscreen = getKey('vc-fullscreen');
        settings.screenshot = getKey('vc-screenshot');
        settings.rotateKey = getKey('vc-rotateKey');
        settings.flipKey = getKey('vc-flipKey');
        settings.screenFullKey = getKey('vc-screenFullKey');
        settings.pipKey = getKey('vc-pipKey');
        settings.cleanKey = getKey('vc-cleanKey');
        settings.zoomUpKey = getKey('vc-zoomUpKey');
        settings.zoomDownKey = getKey('vc-zoomDownKey');
        settings.panKey = getKey('vc-panKey');
        settings.openSettingsKey = getKey('vc-openSettingsKey');

        for (let i = 1; i <= 4; i++) {
            settings['quickSpeed' + i + 'Key'] = getKey('vc-qk' + i);
        }

        settings.speedStep = Math.max(0.05, getNum('vc-speedStep') || DEFAULT_SETTINGS.speedStep);
        settings.skipSeconds = Math.max(0, getNum('vc-skipSeconds') || DEFAULT_SETTINGS.skipSeconds);
        settings.volumeStep = Math.max(0.01, getNum('vc-volumeStep') || DEFAULT_SETTINGS.volumeStep);
        settings.brightnessStep = Math.max(0.01, getNum('vc-brightnessStep') || DEFAULT_SETTINGS.brightnessStep);
        settings.zoomStep = Math.max(0.01, getNum('vc-zoomStep') || DEFAULT_SETTINGS.zoomStep);

        settings.autoSpeedEnabled = getBool('vc-autoSpeedEnabled');
        settings.autoSpeed = Math.max(0.25, Math.min(16, getNum('vc-autoSpeed') || DEFAULT_SETTINGS.autoSpeed));
        settings.autoVolumeEnabled = getBool('vc-autoVolumeEnabled');
        settings.autoVolume = Math.max(0, Math.min(5, getNum('vc-autoVolume') || DEFAULT_SETTINGS.autoVolume));
        settings.loudnessEnabled = getBool('vc-loudnessEnabled');
        settings.autoBrightnessEnabled = getBool('vc-autoBrightnessEnabled');
        settings.autoBrightness = Math.max(0, Math.min(3, getNum('vc-autoBrightness') || DEFAULT_SETTINGS.autoBrightness));
        settings.autoPlayEnabled = getBool('vc-autoPlayEnabled');

        for (let i = 1; i <= 4; i++) {
            let val = getNum('vc-qk' + i + 'Val');
            if (!isNaN(val)) settings['quickSpeed' + i + 'Val'] = Math.max(0.25, Math.min(16, val));
        }

        settings.toastDuration = getNum('vc-toastDuration');
        if (isNaN(settings.toastDuration)) settings.toastDuration = DEFAULT_SETTINGS.toastDuration;
        var posSel = panel.querySelector('#vc-toastPosition');
        settings.toastPosition = posSel ? posSel.value : DEFAULT_SETTINGS.toastPosition;

        settings.siteMemoryEnabled = getBool('vc-siteMemoryEnabled');
        settings.biliProgressEnabled = getBool('vc-biliProgressEnabled');
        settings.favEnabled = getBool('vc-favEnabled');
        settings.autoNextEnabled = getBool('vc-autoNextEnabled');
        settings.noMemorySites = getVal('vc-noMemorySites');
    }

    // ======================= 视频收藏 =======================
    var FAV_KEY = 'vc_fav_list', FAV_PANEL_KEY = 'vc_fav_panel';
    var _favGroup, _favPanel, _favList, _favState = { opened: false, batch: false, checked: new Set() };

    function initFav() {
        var old = document.getElementById('vc-fav-group');
        if (old) { old.remove(); _favPanel && _favPanel.remove(); _favState.opened = false; }
        if (!settings.favEnabled) return;
        if (!document.querySelector('video')) return;

        function fl() { try { return JSON.parse(GM_getValue(FAV_KEY, '[]')); } catch { return []; } }
        function fs(v) { GM_setValue(FAV_KEY, JSON.stringify(v)); }
        function nu(u) { try { var x = new URL(u); x.hash = x.search = ''; return x.origin + x.pathname.replace(/\/$/,''); } catch { return u; } }
        function es(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function pi() {
            return { url: nu(location.href), full: location.href, title: document.title || '无标题' };
        }

        _favGroup = document.createElement('div');
        _favGroup.id = 'vc-fav-group';
        _favGroup.style.cssText = 'all: initial; position:fixed;left:0;top:calc(25% - 66px);width:36px;height:84px;z-index:2147483646';
        const _favGroupShadow = _favGroup.attachShadow({ mode: 'open' });
        var playBtn = document.createElement('div');
        playBtn.id = 'vc-fav-play';
        playBtn.textContent = '▶';
        playBtn.style.cssText = 'position:absolute;top:0;left:0;width:36px;height:36px;background:#e3f2fd;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;color:#1565c0;font-size:20px;font-weight:1000;line-height:1;opacity:0;pointer-events:none;transition:opacity 0.2s;font-family:sans-serif';
        playBtn.style.display = 'flex';
        playBtn.style.alignItems = 'center';
        playBtn.style.justifyContent = 'center';
        playBtn.onmouseenter = function() { openFav(); };
        var plusBtn = document.createElement('div');
        plusBtn.id = 'vc-fav-plus';
        plusBtn.textContent = '＋';
        plusBtn.style.cssText = 'position:absolute;bottom:0;left:0;width:36px;height:36px;background:#e3f2fd;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;color:#1565c0;font-size:28px;font-weight:1000;line-height:1;font-family:sans-serif';
        plusBtn.style.display = 'flex';
        plusBtn.style.alignItems = 'center';
        plusBtn.style.justifyContent = 'center';
        plusBtn.onclick = toggleFav;
        _favGroupShadow.append(playBtn, plusBtn);

        // 鼠标移入浮球组显示 ▶，移出隐藏
        _favGroup.onmouseenter = function() {
            playBtn.style.opacity = '1';
            playBtn.style.pointerEvents = 'auto';
        };
        _favGroup.onmouseleave = function() {
            if (!_favState.opened) {
                playBtn.style.opacity = '0';
                playBtn.style.pointerEvents = 'none';
            }
        };
        document.body.appendChild(_favGroup);

        _favPanel = document.createElement('div');
        _favPanel.id = 'vc-fav-panel';
        _favPanel.style.cssText = 'all: initial; position:fixed;left:-380px;top:25%;z-index:2147483645;width:360px;max-height:70vh;background:#e3f2fd;display:flex;flex-direction:column;font:13px/1.5 sans-serif;color:#222;transition:left .3s;overflow:hidden;box-sizing:border-box';
        const _favPanelShadow = _favPanel.attachShadow({ mode: 'open' });
        const _favPanelInner = document.createElement('div');
        _favPanelInner.style.cssText = 'width:100%;height:100%;font:13px/1.5 sans-serif;color:#222;background:#e3f2fd;display:flex;flex-direction:column';
        _favPanelInner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:4px 16px;border-bottom:1px solid rgba(0,0,0,.06);min-height:28px">'
            + '<div id="fav-tbar-norm"></div>'
            + '<div id="fav-tbar-batch" style="display:none">'
            + '<button id="fav-sel" style="height:20px;border:1px solid #1565c0;border-radius:4px;font-size:13px;cursor:pointer;background:transparent;color:#1565c0;padding:0 14px">全选</button>'
            + '<button id="fav-conf" style="height:20px;border:none;border-radius:4px;font-size:13px;cursor:pointer;background:#e74c3c;color:#fff;padding:0 14px;margin-left:4px">确定</button>'
            + '<button id="fav-cancel" style="height:20px;border:1px solid #1565c0;border-radius:4px;font-size:13px;cursor:pointer;background:transparent;color:#1565c0;padding:0 14px;margin-left:4px">取消</button>'
            + '</div>'
            + '<span style="flex:1"></span>'
            + '<button id="fav-trash" title="批量删除" style="background:none;border:none;cursor:pointer;height:20px;width:20px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;color:#333;padding:0">🗑</button>'
            + '<button id="fav-close" title="关闭" style="background:none;border:none;cursor:pointer;height:20px;width:20px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;color:#333;padding:0">✕</button>'
            + '</div>'
            + '<div id="fav-list" style="flex:1;overflow-y:auto;padding:4px 8px;min-height:60px;max-height:320px;user-select:none"><div style="text-align:center;color:#999;padding:28px 0;font-size:13px">暂无收藏</div></div>';
        _favPanelShadow.appendChild(_favPanelInner);
        document.body.appendChild(_favPanel);
        _favList = _favPanelShadow.querySelector('#fav-list');

        function openFav() {
            if (_favState.opened) return;
            _favState.opened = true;
            _favPanel.style.left = '0';
            _favGroup.style.opacity = '0';
            _favGroup.style.pointerEvents = 'none';
            renderFav();
        }
        function closeFav() {
            if (_favState.batch) { _favState.batch = false; _favState.checked.clear(); }
            _favState.opened = false;
            _favPanel.style.left = '-380px';
            _favGroup.style.opacity = '';
            _favGroup.style.pointerEvents = '';
            playBtn.style.opacity = '0';
            playBtn.style.pointerEvents = 'none';
            GM_setValue(FAV_PANEL_KEY, '0');
        }
        _favPanelShadow.querySelector('#fav-close').onclick = closeFav;
        _favPanelShadow.querySelector('#fav-trash').onclick = function() {
            _favState.batch = true;
            _favState.checked.clear();
            renderFav();
        };
        _favPanelShadow.querySelector('#fav-sel').onclick = function() {
            var vids = fl();
            if (_favState.checked.size === vids.length) _favState.checked.clear();
            else vids.forEach(function(_, i) { _favState.checked.add(i); });
            renderFav();
            this.textContent = _favState.checked.size === fl().length ? '取消全选' : '全选';
        };
        _favPanelShadow.querySelector('#fav-conf').onclick = function() {
            if (!_favState.checked.size) return;
            var vids = fl();
            Array.from(_favState.checked).sort(function(a, b) { return b - a; }).forEach(function(i) { vids.splice(i, 1); });
            fs(vids);
            _favState.batch = false;
            _favState.checked.clear();
            renderFav();
        };
        _favPanelShadow.querySelector('#fav-cancel').onclick = function() {
            _favState.batch = false;
            _favState.checked.clear();
            renderFav();
        };

        function toggleFav() {
            var info = pi(), vids = fl();
            var idx = vids.findIndex(function(v) { return nu(v.url) === info.url; });
            if (idx !== -1) vids.splice(idx, 1);
            else vids.push({ url: info.url, full: info.full, title: info.title, addedAt: Date.now() });
            fs(vids);
            renderFav();
        }

        function renderFav() {
            var vids = fl(), curUrl = pi().url, isBatch = _favState.batch;
            var norm = _favPanelShadow.querySelector('#fav-tbar-norm'), bat = _favPanelShadow.querySelector('#fav-tbar-batch');
            norm.style.display = isBatch ? 'none' : '';
            bat.style.display = isBatch ? '' : 'none';
            var trash = _favPanelShadow.querySelector('#fav-trash');
            trash.style.display = isBatch ? 'none' : '';
            var idx2 = vids.findIndex(function(v) { return nu(v.url) === curUrl; });
            var plus = _favGroupShadow.querySelector('#vc-fav-plus');
            if (plus) {
                plus.textContent = idx2 !== -1 ? '−' : '＋';
                plus.style.color = idx2 !== -1 ? '#e74c3c' : '#1565c0';
            }
            if (!vids.length) {
                _favList.innerHTML = '<div style="text-align:center;color:#999;padding:28px 0;font-size:13px">暂无收藏</div>';
                return;
            }
            _favList.innerHTML = vids.map(function(v, i) {
                var c = isBatch && _favState.checked.has(i);
                return '<div class="fav-item" style="display:flex;align-items:center;gap:6px;padding:6px;cursor:pointer;background:' + (c ? '#90caf9' : '#e3f2fd') + '" data-i="' + i + '">'
                    + (isBatch ? '<input type="checkbox" class="fav-cb"' + (c ? ' checked' : '') + ' style="width:16px;height:16px;flex-shrink:0;accent-color:#1565c0;cursor:pointer;margin:0">' : '')
                    + '<span style="width:22px;flex-shrink:0;font-size:11px;color:#333;text-align:center">' + (i + 1) + '</span>'
                    + '<div style="flex:1;min-width:0"><div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + (nu(v.url) === curUrl ? '#e74c3c;font-weight:600' : '#222') + '">' + es(v.title) + '</div></div>'
                    + (isBatch ? '' : '<span class="fav-copy" style="flex-shrink:0;font-size:13px;color:#1565c0;cursor:pointer;padding:0 4px">🔗</span>') + '</div>';
            }).join('');

            _favList.querySelectorAll('.fav-item').forEach(function(el, idx) {
                // 悬停变色
                el.onmouseenter = function() { el.style.background = '#90caf9'; };
                el.onmouseleave = function() {
                    var cb = el.querySelector('.fav-cb');
                    el.style.background = (cb && cb.checked) ? '#90caf9' : '#e3f2fd';
                };
                if (isBatch) {
                    var cb = el.querySelector('.fav-cb');
                    if (cb) cb.onchange = function() {
                        var i2 = parseInt(el.dataset.i);
                        this.checked ? _favState.checked.add(i2) : _favState.checked.delete(i2);
                        var sel = _favPanelShadow.querySelector('#fav-sel');
                        sel.textContent = _favState.checked.size === vids.length ? '取消全选' : '全选';
                    };
                } else {
                    el.onclick = function(e) {
                        if (e.target.classList.contains('fav-copy')) return;
                        var vids2 = fl(), i2 = parseInt(el.dataset.i);
                        if (_favState.opened && vids2[i2]) { GM_setValue(FAV_PANEL_KEY, '1'); location.href = vids2[i2].url; }
                    };
                    var copyBtn = el.querySelector('.fav-copy');
                    if (copyBtn) copyBtn.onclick = function(e) {
                        e.stopPropagation();
                        var vids2 = fl(), i2 = parseInt(el.dataset.i);
                        if (vids2[i2]) {
                            navigator.clipboard.writeText(vids2[i2].url).catch(function() {});
                        }
                    };
                }
            });
            var selBtn = _favPanelShadow.querySelector('#fav-sel');
            selBtn.textContent = _favState.checked.size === vids.length ? '取消全选' : '全选';
            // 滚动到当前页面所在项
            var curIdx = vids.findIndex(function(v) { return nu(v.url) === curUrl; });
            if (curIdx >= 0 && _favList.children[curIdx]) {
                _favList.children[curIdx].scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }
        }

        if (GM_getValue(FAV_PANEL_KEY, '0') === '1') {
            GM_setValue(FAV_PANEL_KEY, '0');
            _favState.opened = true;
            _favPanel.style.left = '0';
            _favGroup.style.opacity = '0';
            _favGroup.style.pointerEvents = 'none';
            renderFav();
        }

        // 监听网址变化（B站 SPA 切集时更新收藏按钮状态）
        var _favLastUrl = pi().url;
        setInterval(function() {
            var cur = pi().url;
            if (cur !== _favLastUrl) {
                _favLastUrl = cur;
                var plus = _favGroupShadow.querySelector('#vc-fav-plus');
                if (!plus) return;
                var vids = fl(), idx = vids.findIndex(function(v) { return nu(v.url) === cur; });
                plus.textContent = idx !== -1 ? '−' : '＋';
                plus.style.color = idx !== -1 ? '#e74c3c' : '#1565c0';
            }
        }, 1000);
    }

    var _vcActivated = false;
    var _vcStageObserver = null;
    var _vcStageTimer = null;
    var _vcSettled = false;
    var _vcPending = false;

    function checkVideoNode(node) {
        if (!node || node.nodeType !== 1) return false;
        if (node.matches && node.matches(VIDEO_SEL)) return true;
        if (node.querySelectorAll) {
            try { if (node.querySelector(VIDEO_SEL)) return true; } catch (e) {}
        }
        if (node.shadowRoot) {
            try { if (node.shadowRoot.querySelector(VIDEO_SEL)) return true; } catch (e) {}
        }
        return false;
    }

    function hasAnyVideo() {
        try {
            if (document.querySelector(VIDEO_SEL)) return true;
        } catch (e) {}
        if (window._vcShadowDomList_) {
            for (var i = 0; i < window._vcShadowDomList_.length; i++) {
                try {
                    var sr = window._vcShadowDomList_[i];
                    if (sr && sr.querySelector(VIDEO_SEL)) return true;
                } catch (e) {}
            }
        }
        return false;
    }

    function tryActivate() {
        if (_vcActivated) return;
        if (!hasAnyVideo()) return;
        _vcActivated = true;
        if (_vcStageObserver) { _vcStageObserver.disconnect(); _vcStageObserver = null; }
        if (_vcStageTimer) { clearTimeout(_vcStageTimer); _vcStageTimer = null; }
        initFullFeatures();
    }

    function settleNoVideo() {
        if (_vcSettled || _vcActivated) return;
        _vcSettled = true;
        if (_vcStageObserver) { _vcStageObserver.disconnect(); _vcStageObserver = null; }
        if (_vcStageTimer) { clearTimeout(_vcStageTimer); _vcStageTimer = null; }
    }

    function scheduleVideoCheck() {
        if (_vcPending || _vcActivated) return;
        _vcPending = true;
        (window.requestIdleCallback || window.requestAnimationFrame || function (cb) { setTimeout(cb, 0); })(function () {
            _vcPending = false;
            if (_vcActivated || _vcSettled) return;
            if (hasAnyVideo()) { tryActivate(); return; }
        });
    }

    function setupStageWatch() {
        if (_vcStageObserver || _vcSettled) return;
        try {
            _vcStageObserver = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        if (checkVideoNode(added[j])) { tryActivate(); return; }
                    }
                }
                scheduleVideoCheck();
            });
            _vcStageObserver.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) {
            settleNoVideo();
            return;
        }
        if (document.readyState === 'complete') {
            _vcStageTimer = setTimeout(settleNoVideo, 3000);
        } else {
            window.addEventListener('load', function () {
                if (_vcActivated || _vcSettled) return;
                if (hasAnyVideo()) { tryActivate(); return; }
                _vcStageTimer = setTimeout(settleNoVideo, 3000);
            }, { once: true });
        }
    }

    function init() {
        loadSettings();
        loadSiteSettings();
        _webAutoNextDisabled = settings.autoNextWebDisabled || false;

        hijackPlaybackRate();
        hackAttachShadow();

        if (hasAnyVideo()) {
            tryActivate();
        } else {
            setupStageWatch();
        }

        if (settings.favEnabled) {
            setTimeout(function() { if (!document.getElementById('vc-fav-group')) initFav(); }, 500);
        }

        if (!settings.hideMenuEntry && typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('视频控制器 设置', openSettings);
        }
    }

    function initFullFeatures() {
        document.addEventListener('fullscreenchange', function () {
            var host = document.fullscreenElement || document.body;
            if (_toastEl && _toastEl.parentNode !== host) host.appendChild(_toastEl);
            if (host && host.tagName === 'VIDEO') host = host.parentElement;
            var pnl = document.getElementById('vc-settings-panel');
            if (pnl && pnl.parentNode !== host) {
                host.appendChild(pnl);
            }
        });

        document.addEventListener('mousedown', function(e) {
            if (!_panVideo || e.button !== 0) return;
            if (!_panVideo.contains(e.target) && e.target !== _panVideo) return;
            e.preventDefault();
            _panX = e.clientX; _panY = e.clientY;
            _panOX = _panVideo._vcPanX || 0; _panOY = _panVideo._vcPanY || 0;
            _panVideo.style.cursor = 'grabbing';
            _panVideo._vcPanning = true;
        });
        document.addEventListener('mousemove', function(e) {
            if (!_panVideo || !_panVideo._vcPanning) return;
            _panVideo._vcPanX = _panOX + e.clientX - _panX;
            _panVideo._vcPanY = _panOY + e.clientY - _panY;
            applyVideoTransform(_panVideo);
        });
        document.addEventListener('mouseup', function() {
            if (_panVideo) { _panVideo._vcPanning = false; _panVideo.style.cursor = 'grab'; }
        });
        bindAllVideos();
        biliProgressInit();
        setInterval(injectNextUI, 2000);
        setupAutoNext(_webAutoNextDisabled ? 'off' : getNextMode());
        initFav();

        document.addEventListener('vcAddShadowRoot', function (e) {
            if (e.detail && e.detail.shadowRoot) {
                try {
                    e.detail.shadowRoot.querySelectorAll(VIDEO_SEL).forEach(bindVideoEvents);
                } catch (_) {}
            }
        });

        const observer = new MutationObserver(function (mutations) {
            for (let i = 0; i < mutations.length; i++) {
                const addedNodes = mutations[i].addedNodes;
                for (let j = 0; j < addedNodes.length; j++) {
                    const node = addedNodes[j];
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches(VIDEO_SEL)) {
                            bindVideoEvents(node);
                            if (settings.favEnabled && !document.getElementById('vc-fav-group')) {
                                initFav();
                            }
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll(VIDEO_SEL).forEach(function(v) {
                                bindVideoEvents(v);
                                if (settings.favEnabled && !document.getElementById('vc-fav-group')) {
                                    initFav();
                                }
                            });
                        }
                    }
                }
                if (_panVideo && !document.contains(_panVideo)) {
                    _panVideo._vcPanning = false;
                    _panVideo = null;
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        setTimeout(function() {
            if (settings.favEnabled && !document.getElementById('vc-fav-group')) {
                initFav();
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();