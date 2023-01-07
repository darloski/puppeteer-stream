"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = exports.launch = exports.Stream = void 0;
const puppeteer_core_1 = require("puppeteer-core");
const stream_1 = require("stream");
const path = __importStar(require("path"));
let currentIndex = 0;
class Stream extends stream_1.Readable {
    constructor(page, options) {
        super(options);
        this.page = page;
    }
    _read() { }
    // @ts-ignore
    destroy() {
        const _super = Object.create(null, {
            destroy: { get: () => super.destroy }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.page.browser().videoCaptureExtension) === null || _a === void 0 ? void 0 : _a.evaluate((index) => {
                // @ts-ignore
                STOP_RECORDING(index);
            }, this.page.index));
            _super.destroy.call(this);
            return this;
        });
    }
}
exports.Stream = Stream;
function launch(arg1, opts) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        //if puppeteer library is not passed as first argument, then first argument is options
        if (typeof arg1.launch != "function") {
            opts = arg1;
        }
        if (!opts)
            opts = {};
        if (!opts.args)
            opts.args = [];
        const extensionPath = path.join(__dirname, "..", "extension");
        const extensionId = "jjndjgheafjngoipoacpjgeicjeomjli";
        let loadExtension = false;
        let loadExtensionExcept = false;
        let whitelisted = false;
        opts.args = opts.args.map((x) => {
            if (x.includes("--load-extension=")) {
                loadExtension = true;
                return x + "," + extensionPath;
            }
            else if (x.includes("--disable-extensions-except=")) {
                loadExtensionExcept = true;
                return "--disable-extensions-except=" + extensionPath + "," + x.split("=")[1];
            }
            else if (x.includes("--whitelisted-extension-id")) {
                whitelisted = true;
                return x + "," + extensionId;
            }
            return x;
        });
        if (!loadExtension)
            opts.args.push("--load-extension=" + extensionPath);
        if (!loadExtensionExcept)
            opts.args.push("--disable-extensions-except=" + extensionPath);
        if (!whitelisted)
            opts.args.push("--whitelisted-extension-id=" + extensionId);
        if (((_a = opts.defaultViewport) === null || _a === void 0 ? void 0 : _a.width) && ((_b = opts.defaultViewport) === null || _b === void 0 ? void 0 : _b.height))
            opts.args.push(`--window-size=${(_c = opts.defaultViewport) === null || _c === void 0 ? void 0 : _c.width}x${(_d = opts.defaultViewport) === null || _d === void 0 ? void 0 : _d.height}`);
        opts.headless = false;
        let browser;
        if (typeof arg1.launch == "function") {
            browser = yield arg1.launch(opts);
        }
        else {
            browser = yield (0, puppeteer_core_1.launch)(opts);
        }
        browser.encoders = new Map();
        const extensionTarget = yield browser.waitForTarget(
        // @ts-ignore
        (target) => target.type() === "background_page" &&
            target.url() === `chrome-extension://${extensionId}/_generated_background_page.html`);
        if (!extensionTarget) {
            throw new Error("cannot load extension");
        }
        const videoCaptureExtension = yield extensionTarget.page();
        if (!videoCaptureExtension) {
            throw new Error("cannot get page of extension");
        }
        browser.videoCaptureExtension = videoCaptureExtension;
        yield browser.videoCaptureExtension.exposeFunction("sendData", (opts) => {
            var _a, _b;
            const data = Buffer.from(str2ab(opts.data));
            const timecode = opts.timecode;
            (_b = (_a = browser.encoders) === null || _a === void 0 ? void 0 : _a.get(opts.id)) === null || _b === void 0 ? void 0 : _b.push({ data, timecode });
        });
        yield browser.videoCaptureExtension.exposeFunction("log", (...opts) => {
            console.log("videoCaptureExtension", ...opts);
        });
        return browser;
    });
}
exports.launch = launch;
function getStream(page, opts) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const encoder = new Stream(page);
        if (!opts.audio && !opts.video)
            throw new Error("At least audio or video must be true");
        if (!opts.mimeType) {
            if (opts.video)
                opts.mimeType = "video/webm";
            else if (opts.audio)
                opts.mimeType = "audio/webm";
        }
        if (!opts.frameSize)
            opts.frameSize = 20;
        yield page.bringToFront();
        if (page.index === undefined) {
            page.index = currentIndex++;
        }
        yield ((_a = page.browser().videoCaptureExtension) === null || _a === void 0 ? void 0 : _a.evaluate((settings) => {
            // @ts-ignore
            START_RECORDING(settings);
        }, Object.assign(Object.assign({}, opts), { index: page.index })));
        (_b = page.browser().encoders) === null || _b === void 0 ? void 0 : _b.set(page.index, encoder);
        return encoder;
    });
}
exports.getStream = getStream;
function str2ab(str) {
    // Convert a UTF-8 String to an ArrayBuffer
    var buf = new ArrayBuffer(str.length); // 1 byte for each char
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHVwcGV0ZWVyU3RyZWFtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1B1cHBldGVlclN0cmVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQU93QjtBQUN4QixtQ0FBbUQ7QUFDbkQsMkNBQTZCO0FBSTdCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUVyQixNQUFhLE1BQU8sU0FBUSxpQkFBUTtJQUNuQyxZQUFvQixJQUF1QixFQUFFLE9BQXlCO1FBQ3JFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQURJLFNBQUksR0FBSixJQUFJLENBQW1CO0lBRTNDLENBQUM7SUFFRCxLQUFLLEtBQUksQ0FBQztJQUVWLGFBQWE7SUFDUCxPQUFPOzs7Ozs7WUFDWixNQUFNLENBQUEsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLHFCQUFxQiwwQ0FBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbkUsYUFBYTtnQkFDYixjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQztZQUNwQixPQUFNLE9BQU8sWUFBRztZQUNoQixPQUFPLElBQUksQ0FBQzs7S0FDWjtDQUNEO0FBaEJELHdCQWdCQztBQVdELFNBQXNCLE1BQU0sQ0FDM0IsSUFBa0YsRUFDbEYsSUFBMkU7OztRQUUzRSxzRkFBc0Y7UUFDdEYsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksVUFBVSxFQUFFO1lBQ3JDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDWjtRQUVELElBQUksQ0FBQyxJQUFJO1lBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUVyQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7WUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztR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