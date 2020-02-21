"use strict";

/**
 * @var preferences [Object] JSON that holds preferences
 *
 * @see default-prefs.js
 * @see https://github.com/An-dz/ScriptJaeger/wiki/Dev:-Preferences
 *
 * ---
 *
 * Block policy (rule key)
 *
 * 0 Allowed - All scripts allowed, white(black)list doesn't run
 * 1 Filtered - Only from the same domain allowed
 * 2 Relaxed - From same domain & helpers are allowed
 * 3 Blocked - All scripts blocked, white(black)list doesn't run
 * 4	Block injected - Inline script is blocked
 * 5	Pretend disabled - Pretend scripts are blocked (load noscript tags)
 *
 * ---
 *
 * Whitelist & Blacklist (rules key)
 *
 * true  blocked/blacklist
 * false allowed/whitelist
 */
let preferences = {};

/**
 * @var tabStorage [Object] Holds info about the open tabs
 *
 * Each tab is represented as a child object with key as tab ID
 *
 * Children:
 * - protocol  [String]  Protocol part of the url
 * - domain    [String]  Domain/Host part of the url
 * - subdomain [String]  Subdomains part of the url
 * - page      [String]  Page path part of the url
 * - query     [String]  Query of the url
 * - policy    [Number]  Policy to be applied
 * - rules     [Object]  Blackwhitelist to be applied
 * - private   [Boolean] If tab is in a private window
 * - blocked   [Number]  Number of blocked scripts
 * - scripts   [Object]  List of all scripts from the page
 * - frames    [Object]  Info about sub-frames in the tab
 */
const tabStorage = {};

/**
 * @var ports [Object] This object keeps track of all open
 * communication ports with popup interfaces.
 *
 * The keys are the ID of the window the popup belongs to and the
 * values are the runtime.Port interfaces.
 *
 * @note These ports might be used on many parts of the code to
 * update the popup in realtime.
 */
const ports = {};

/**
 * @var privatum [Object] Holds all preferences on private browsing
 *
 * It's only filled when required and is cleared when no longer
 *
 * - windows     [Object] Holds the number of open private windows
 * in `length` and their ids as keys with `true` values
 * - preferences [Object] copy of normal policy
 *
 * @see createPrivatePrefs()
 */
let privatum = {
	windows: {length: 0},
	preferences: {}
};

/**
 * @var jaegerhut [Object] Badge icons, one for each policy
 */
const jaegerhut = {
	0: {
		name: "allowall",
		colour: "#D84A4A"
	},
	1: {
		name: "relaxed",
		colour: "#559FE6"
	},
	2: {
		name: "filtered",
		colour: "#73AB55"
	},
	3: {
		name: "blockall",
		colour: "#26272A"
	},
	undefined: {
		colour: "#6F7072"
	}
};

/* ====================================================================== */

/**
 * @brief Called when default preferences are loaded
 *
 * Saves the default preferences in storage
 *
 * @see default-prefs.js
 */
function defaultPreferencesLoaded() {
	chrome.storage.local.set({preferences: preferences});

	// remove the injected script
	document.head.removeChild(document.getElementById("default"));
}

/**
 * @brief Open download page
 *
 * Clicking on the update notification will open the GitHub releases
 *
 * @param notification [String] An ID of the clicked notification
 */
chrome.notifications.onClicked.addListener((notification) => {
	chrome.tabs.create({
		url: "https://github.com/An-dz/ScriptJaeger/releases"
	});
	chrome.notifications.clear(notification);
});

/**
 * @brief Check for updates
 *
 * A created alarm will check for updates regularly.
 * The manifest.json in the repository will contain the version number
 */
chrome.alarms.onAlarm.addListener(function checkUpdates() {
	const xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function processUpdate() {
		if (xhr.readyState !== 4) {
			return;
		}

		const currentVersion = chrome.runtime.getManifest().version;
		const version = JSON.parse(xhr.responseText).version;

		// if version is equal then we are up-to-date
		if (version === currentVersion) {
			return;
		}

		chrome.notifications.create({
			type: "basic",
			title: chrome.i18n.getMessage("updateTitle"),
			iconUrl: "images/jaegerhut128.png",
			message: chrome.i18n.getMessage("updateMessage", [version, currentVersion]),
			contextMessage: chrome.i18n.getMessage("updateContext"),
			isClickable: true,
			requireInteraction: true
		});
	};

	xhr.open("GET", `https://raw.githubusercontent.com/An-dz/ScriptJaeger/master/manifest.json?time=${Date.now()}`);
	xhr.send();
});

/* ======================================================================
 * Relaxed mode functions and variables, default values based from
 * ScriptWeeder https://github.com/lemonsqueeze/scriptweeder
 * ====================================================================== */

/**
 * @var standardSecondLevelDomains [Object] List of common standard
 * second level domains
 *
 * This is a list of top-level domains for identifying hosts and
 * subdomains from URLs.
 *
 * @note This smaller list is for performance as most domains will
 * fall under these rules.
 */
const standardSecondLevelDomains = { "com": 1, "org": 1, "net": 1, "gov": 1, "co": 1, "info": 1, "ac": 1, "or": 1, "tm": 1, "edu": 1, "mil": 1, "sch": 1, "int": 1, "nom": 1, "biz": 1, "gob": 1, "asso": 1 };

/**
 * @var otherSecondLevelDomains [Object] List of top-level domains
 *
 * This is a list of top-level domains for identifying hosts and
 * subdomains from URLs.
 *
 * @note From http://publicsuffix.org
 *
 * @note The standard above and long constructions are omitted
 *
 * @note Those are only tested if the above failed
 */
const otherSecondLevelDomains = {
	"aero": { "caa": 1, "club": 1, "crew": 1, "dgca": 1, "fuel": 1, "res": 1, "show": 1, "taxi": 1},
	"ai": { "off": 1},
	"ao": { "ed": 1, "gv": 1, "it": 1, "og": 1, "pb": 1},
	"ar": { "tur": 1},
	"arpa": { "e164": 1, "ip6": 1, "iris": 1, "uri": 1, "urn": 1},
	"at": { "gv": 1, "priv": 1},
	"au": { "act": 1, "asn": 1, "conf": 1, "id": 1, "nsw": 1, "nt": 1, "oz": 1, "qld": 1, "sa": 1, "tas": 1, "vic": 1, "wa": 1},
	"az": { "name": 1, "pp": 1, "pro": 1},
	"ba": { "rs": 1, "unbi": 1, "unsa": 1},
	"bb": { "store": 1, "tv": 1},
	"bg": { "0": 1, "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 1, "a": 1, "b": 1, "c": 1, "d": 1, "e": 1, "f": 1, "g": 1, "h": 1, "i": 1, "j": 1, "k": 1, "l": 1, "m": 1, "n": 1, "o": 1, "p": 1, "q": 1, "r": 1, "s": 1, "t": 1, "u": 1, "v": 1, "w": 1, "x": 1, "y": 1, "z": 1},
	"bj": { "barreau": 1, "gouv": 1},
	"bo": { "tv": 1},
	"br": { "adm": 1, "adv": 1, "agr": 1, "am": 1, "arq": 1, "art": 1, "ato": 1, "b": 1, "bio": 1, "blog": 1, "bmd": 1, "cim": 1, "cng": 1, "cnt": 1, "coop": 1, "ecn": 1, "eco": 1, "emp": 1, "eng": 1, "esp": 1, "etc": 1, "eti": 1, "far": 1, "flog": 1, "fm": 1, "fnd": 1, "fot": 1, "fst": 1, "g12": 1, "ggf": 1, "imb": 1, "ind": 1, "inf": 1, "jor": 1, "jus": 1, "leg": 1, "lel": 1, "mat": 1, "med": 1, "mp": 1, "mus": 1, "nom": 1, "not": 1, "ntr": 1, "odo": 1, "ppg": 1, "pro": 1, "psc": 1, "psi": 1, "qsl": 1, "radio": 1, "rec": 1, "slg": 1, "srv": 1, "taxi": 1, "teo": 1, "tmp": 1, "trd": 1, "tur": 1, "tv": 1, "vet": 1, "vlog": 1, "wiki": 1, "zlg": 1},
	"by": { "of": 1},
	"ca": { "ab": 1, "bc": 1, "gc": 1, "mb": 1, "nb": 1, "nf": 1, "nl": 1, "ns": 1, "nt": 1, "nu": 1, "on": 1, "pe": 1, "qc": 1, "sk": 1, "yk": 1},
	"ci": { "ed": 1, "go": 1, "gouv": 1, "md": 1, "presse": 1},
	"cn": { "ah": 1, "bj": 1, "cq": 1, "fj": 1, "gd": 1, "gs": 1, "gx": 1, "gz": 1, "ha": 1, "hb": 1, "he": 1, "hi": 1, "hk": 1, "hl": 1, "hn": 1, "jl": 1, "js": 1, "jx": 1, "ln": 1, "mo": 1, "nm": 1, "nx": 1, "qh": 1, "sc": 1, "sd": 1, "sh": 1, "sn": 1, "sx": 1, "tj": 1, "tw": 1, "xj": 1, "xz": 1, "yn": 1, "zj": 1},
	"co": { "arts": 1, "firm": 1, "rec": 1, "web": 1},
	"cr": { "ed": 1, "fi": 1, "go": 1, "sa": 1},
	"cu": { "inf": 1},
	"cx": { "ath": 1},
	"cy": { "ltd": 1, "name": 1, "press": 1, "pro": 1},
	"do": { "art": 1, "sld": 1, "web": 1},
	"dz": { "art": 1, "pol": 1},
	"ec": { "fin": 1, "k12": 1, "med": 1, "pro": 1},
	"ee": { "aip": 1, "fie": 1, "lib": 1, "med": 1, "pri": 1, "riik": 1},
	"eg": { "eun": 1, "name": 1, "sci": 1},
	"et": { "name": 1},
	"fi": { "iki": 1, "aland": 1},
	"fr": { "cci": 1, "gouv": 1, "port": 1, "prd": 1},
	"ge": { "pvt": 1},
	"gi": { "ltd": 1, "mod": 1},
	"gp": { "mobi": 1},
	"gt": { "ind": 1},
	"hk": { "idv": 1},
	"hr": { "from": 1, "iz": 1, "name": 1},
	"ht": { "art": 1, "coop": 1, "firm": 1, "gouv": 1, "med": 1, "pol": 1, "pro": 1, "rel": 1, "shop": 1},
	"hu": { "2000": 1, "bolt": 1, "city": 1, "film": 1, "news": 1, "priv": 1, "sex": 1, "shop": 1, "suli": 1, "szex": 1},
	"id": { "go": 1, "my": 1, "web": 1},
	"im": { "nic": 1},
	"in": { "firm": 1, "gen": 1, "ind": 1, "nic": 1, "res": 1},
	"int": { "eu": 1},
	"ir": { "id": 1},
	"it": { "ag": 1, "al": 1, "an": 1, "ao": 1, "ap": 1, "aq": 1, "ar": 1, "asti": 1, "at": 1, "av": 1, "ba": 1, "bari": 1, "bg": 1, "bi": 1, "bl": 1, "bn": 1, "bo": 1, "br": 1, "bs": 1, "bt": 1, "bz": 1, "ca": 1, "cb": 1, "ce": 1, "ch": 1, "ci": 1, "cl": 1, "cn": 1, "como": 1, "cr": 1, "cs": 1, "ct": 1, "cz": 1, "en": 1, "enna": 1, "fc": 1, "fe": 1, "fg": 1, "fi": 1, "fm": 1, "fr": 1, "ge": 1, "go": 1, "gr": 1, "im": 1, "is": 1, "kr": 1, "lc": 1, "le": 1, "li": 1, "lo": 1, "lodi": 1, "lt": 1, "lu": 1, "mb": 1, "mc": 1, "me": 1, "mi": 1, "mn": 1, "mo": 1, "ms": 1, "mt": 1, "na": 1, "no": 1, "nu": 1, "og": 1, "ot": 1, "pa": 1, "pc": 1, "pd": 1, "pe": 1, "pg": 1, "pi": 1, "pisa": 1, "pn": 1, "po": 1, "pr": 1, "pt": 1, "pu": 1, "pv": 1, "pz": 1, "ra": 1, "rc": 1, "re": 1, "rg": 1, "ri": 1, "rm": 1, "rn": 1, "ro": 1, "roma": 1, "rome": 1, "sa": 1, "si": 1, "so": 1, "sp": 1, "sr": 1, "ss": 1, "sv": 1, "ta": 1, "te": 1, "tn": 1, "to": 1, "tp": 1, "tr": 1, "ts": 1, "tv": 1, "ud": 1, "va": 1, "vb": 1, "vc": 1, "ve": 1, "vi": 1, "vr": 1, "vs": 1, "vt": 1, "vv": 1},
	"jo": { "name": 1},
	"jp": { "ad": 1, "ed": 1, "gifu": 1, "go": 1, "gr": 1, "lg": 1, "mie": 1, "nara": 1, "ne": 1, "oita": 1, "saga": 1},
	"km": { "ass": 1, "coop": 1, "gouv": 1, "prd": 1},
	"kp": { "rep": 1, "tra": 1},
	"kr": { "es": 1, "go": 1, "hs": 1, "jeju": 1, "kg": 1, "ms": 1, "ne": 1, "pe": 1, "re": 1, "sc": 1},
	"la": { "c": 1, "per": 1},
	"lk": { "assn": 1, "grp": 1, "ltd": 1, "ngo": 1, "soc": 1, "web": 1},
	"lv": { "asn": 1, "conf": 1, "id": 1},
	"ly": { "id": 1, "med": 1, "plc": 1},
	"me": { "its": 1, "priv": 1},
	"mg": { "prd": 1},
	"mk": { "inf": 1, "name": 1},
	"ml": { "gouv": 1},
	"mn": { "nyc": 1},
	"museum": { "air": 1, "and": 1, "art": 1, "arts": 1, "axis": 1, "bahn": 1, "bale": 1, "bern": 1, "bill": 1, "bonn": 1, "bus": 1, "can": 1, "coal": 1, "cody": 1, "dali": 1, "ddr": 1, "farm": 1, "film": 1, "frog": 1, "glas": 1, "graz": 1, "iraq": 1, "iron": 1, "jfk": 1, "juif": 1, "kids": 1, "lans": 1, "linz": 1, "mad": 1, "manx": 1, "mill": 1, "moma": 1, "nrw": 1, "nyc": 1, "nyny": 1, "roma": 1, "satx": 1, "silk": 1, "ski": 1, "spy": 1, "tank": 1, "tcm": 1, "time": 1, "town": 1, "tree": 1, "ulm": 1, "usa": 1, "utah": 1, "uvic": 1, "war": 1, "york": 1},
	"mv": { "aero": 1, "coop": 1, "name": 1, "pro": 1},
	"mw": { "coop": 1},
	"my": { "name": 1},
	"na": { "ca": 1, "cc": 1, "dr": 1, "in": 1, "mobi": 1, "mx": 1, "name": 1, "pro": 1, "tv": 1, "us": 1, "ws": 1},
	"net": { "gb": 1, "hu": 1, "jp": 1, "se": 1, "uk": 1, "za": 1},
	"nf": { "arts": 1, "firm": 1, "per": 1, "rec": 1, "web": 1},
	"nl": { "bv": 1},
	"no": { "aa": 1, "ah": 1, "al": 1, "alta": 1, "amli": 1, "amot": 1, "arna": 1, "aure": 1, "berg": 1, "bodo": 1, "bokn": 1, "bu": 1, "dep": 1, "eid": 1, "etne": 1, "fet": 1, "fhs": 1, "fla": 1, "flå": 1, "fm": 1, "frei": 1, "fusa": 1, "gol": 1, "gran": 1, "grue": 1, "ha": 1, "hl": 1, "hm": 1, "hof": 1, "hol": 1, "hole": 1, "hå": 1, "ivgu": 1, "kvam": 1, "leka": 1, "lier": 1, "lom": 1, "lund": 1, "moss": 1, "mr": 1, "nl": 1, "nt": 1, "odda": 1, "of": 1, "ol": 1, "osen": 1, "oslo": 1, "oyer": 1, "priv": 1, "rade": 1, "rana": 1, "rl": 1, "roan": 1, "rost": 1, "sel": 1, "sf": 1, "ski": 1, "sola": 1, "st": 1, "stat": 1, "sula": 1, "sund": 1, "tana": 1, "time": 1, "tinn": 1, "tr": 1, "va": 1, "vaga": 1, "vang": 1, "vega": 1, "vf": 1, "vgs": 1, "vik": 1, "voss": 1, "ål": 1, "ås": 1},
	"nu": { "mine": 1},
	"org": { "ae": 1, "us": 1, "za": 1},
	"pa": { "abo": 1, "ing": 1, "med": 1, "sld": 1},
	"ph": { "i": 1, "ngo": 1},
	"pk": { "fam": 1, "gok": 1, "gon": 1, "gop": 1, "gos": 1, "web": 1},
	"pl": { "agro": 1, "aid": 1, "art": 1, "atm": 1, "auto": 1, "elk": 1, "gda": 1, "gsm": 1, "irc": 1, "lapy": 1, "mail": 1, "med": 1, "ngo": 1, "nysa": 1, "pc": 1, "pila": 1, "pisz": 1, "priv": 1, "rel": 1, "sex": 1, "shop": 1, "sos": 1, "waw": 1, "wroc": 1},
	"pr": { "est": 1, "isla": 1, "name": 1, "pro": 1, "prof": 1},
	"pro": { "aca": 1, "bar": 1, "cpa": 1, "eng": 1, "jur": 1, "law": 1, "med": 1},
	"ps": { "plo": 1, "sec": 1},
	"pt": { "nome": 1, "publ": 1},
	"pw": { "ed": 1, "go": 1, "ne": 1},
	"py": { "coop": 1},
	"qa": { "name": 1},
	"ro": { "arts": 1, "firm": 1, "nt": 1, "rec": 1, "www": 1},
	"rs": { "in": 1},
	"ru": { "amur": 1, "bir": 1, "cbg": 1, "chel": 1, "cmw": 1, "jar": 1, "kchr": 1, "khv": 1, "kms": 1, "komi": 1, "mari": 1, "msk": 1, "nkz": 1, "nnov": 1, "nov": 1, "nsk": 1, "omsk": 1, "perm": 1, "pp": 1, "ptz": 1, "rnd": 1, "snz": 1, "spb": 1, "stv": 1, "test": 1, "tom": 1, "tsk": 1, "tula": 1, "tuva": 1, "tver": 1, "udm": 1, "vrn": 1},
	"rw": { "gouv": 1},
	"sa": { "med": 1, "pub": 1},
	"sd": { "med": 1, "tv": 1},
	"se": { "a": 1, "b": 1, "bd": 1, "c": 1, "d": 1, "e": 1, "f": 1, "fh": 1, "fhsk": 1, "fhv": 1, "g": 1, "h": 1, "i": 1, "k": 1, "l": 1, "m": 1, "n": 1, "o": 1, "p": 1, "pp": 1, "r": 1, "s": 1, "sshn": 1, "t": 1, "u": 1, "w": 1, "x": 1, "y": 1, "z": 1},
	"sg": { "per": 1},
	"sn": { "art": 1, "gouv": 1, "univ": 1},
	"th": { "go": 1, "in": 1, "mi": 1},
	"tj": { "go": 1, "name": 1, "nic": 1, "test": 1, "web": 1},
	"tn": { "ens": 1, "fin": 1, "ind": 1, "intl": 1, "nat": 1, "rnrt": 1, "rns": 1, "rnu": 1},
	"tt": { "aero": 1, "coop": 1, "jobs": 1, "mobi": 1, "name": 1, "pro": 1},
	"tw": { "club": 1, "ebiz": 1, "game": 1, "idv": 1},
	"tz": { "go": 1, "me": 1, "mobi": 1, "ne": 1, "sc": 1, "tv": 1},
	"ua": { "ck": 1, "cn": 1, "cr": 1, "cv": 1, "dn": 1, "dp": 1, "if": 1, "in": 1, "kh": 1, "kiev": 1, "km": 1, "kr": 1, "krym": 1, "ks": 1, "kv": 1, "kyiv": 1, "lg": 1, "lt": 1, "lv": 1, "lviv": 1, "mk": 1, "od": 1, "pl": 1, "pp": 1, "rv": 1, "sb": 1, "sm": 1, "sumy": 1, "te": 1, "uz": 1, "vn": 1, "zp": 1, "zt": 1},
	"ug": { "go": 1, "ne": 1, "sc": 1},
	"us": { "ak": 1, "al": 1, "ar": 1, "as": 1, "az": 1, "ca": 1, "ct": 1, "dc": 1, "de": 1, "dni": 1, "fed": 1, "fl": 1, "ga": 1, "gu": 1, "hi": 1, "ia": 1, "id": 1, "il": 1, "in": 1, "isa": 1, "kids": 1, "ks": 1, "ky": 1, "la": 1, "ma": 1, "md": 1, "me": 1, "mi": 1, "mn": 1, "mo": 1, "ms": 1, "mt": 1, "nc": 1, "nd": 1, "ne": 1, "nh": 1, "nj": 1, "nm": 1, "nsn": 1, "nv": 1, "ny": 1, "oh": 1, "ok": 1, "pa": 1, "pr": 1, "ri": 1, "sc": 1, "sd": 1, "tn": 1, "tx": 1, "ut": 1, "va": 1, "vi": 1, "vt": 1, "wa": 1, "wi": 1, "wv": 1, "wy": 1},
	"uy": { "gub": 1},
	"ve": { "e12": 1, "web": 1},
	"vi": { "k12": 1},
	"vn": { "name": 1, "pro": 1}
};

/**
 * @brief Check if URL looks 'useful'
 *
 * Checks if we can allow from some common patterns in the url
 *
 * @param site [Object] url object obtained from `extractUrl()`
 *
 * @return [Boolean] identifying if it must be allowed
 *
 * @note url object must contain `domain` and `subdomain` keys
 */
function isCommonHelpers(site) {
	return (
		site.subdomain !== "s"               &&
		site.subdomain.indexOf("tag") === -1 && (
			site.domain.indexOf("cdn")      > -1 ||
			site.domain.indexOf("img")      > -1 ||
			site.domain.indexOf("static")   > -1 ||
			site.subdomain.indexOf("login") > -1 ||
			site.subdomain.indexOf("code") === 0 ||
			site.domain === "google.com"
		)
	);
}

/**
 * @brief Check if script url looks related to site url
 *
 * Checks if the domain name of the site is in the domain of the
 * script. If tab domain is bigger, search for the inverse.
 *
 * @param js  [String] domain obtained from `extractUrl()`
 * @param tab [String] domain obtained from `extractUrl()`
 *
 * @return [Boolean] identifying if it must be allowed
 */
function isRelated(js, tab) {
	if (tab.length > js.length) {
		return isRelated(tab, js);
	}

	const domain = tab.substring(0, tab.indexOf("."));

	if (js.indexOf(domain) > -1 || (domain.length > 2 && js.slice(0, 3) === domain.slice(0, 3))) {
		return true;
	}

	return false;
}

/**
 * @brief Get object with url parts
 *
 * Extracts the important parts of the url and returns an object with
 * each of them in a key.
 *
 * @param url [String] Full url
 *
 * @return [Object] containing the parts of the url
 *
 * @note Return object children:
 * - protocol  [String] contains the protocol (e.g. http://)
 * - subdomain [String] contains the subdomain name (e.g. www)
 * - domain    [String] contains the host name (e.g. github.com)
 * - page      [String] contains the dir & file name (e.g. /index.htm)
 * - query     [String] contains query information (e.g. ?p=a)
 */
function extractUrl(url) {
	/*
	 * Obtain the important parts of the url to load settings
	 * 0 contains the full url (because it's the match of the full regexp)
	 * 1 contains the protocol
	 * 2 contains the full domain (subdomain + domain/host)
	 * 3 contains the directory + filename
	 * 4 contains the query
	 */
	url = url.match(/^([^:]+:\/\/)([^/]+)([^?]+)(.*)$/);
	const domains = url[2].split(".");

	// less than three levels everything is domain
	if (domains.length < 3) {
		url[0] = "";
	}
	else {
		// let's keep it simple, no more than two levels
		let levels = 2;
		const tld = domains[domains.length - 1];
		const sld = domains[domains.length - 2];

		if (tld !== "com" && (standardSecondLevelDomains[sld] || (otherSecondLevelDomains[tld] && otherSecondLevelDomains[tld][sld]))) {
			levels = 3;
		}

		url[0] = domains.slice(0, domains.length - levels).join(".");
		url[2] = domains.slice(domains.length - levels).join(".");
	}

	return {
		protocol:  url[1],
		subdomain: url[0],
		domain:    url[2],
		page:      url[3],
		query:     url[4]
	};
}

/* ====================================================================== */

/**
 * @brief Merge `rules` keys
 *
 * Merges blackwhitelist rules to get correct inherit behaviour
 *
 * @param[in]  from [Object] To copy rules from
 *
 * @param[out] to   [Object] To copy rules into
 */
function mergeRules(from, to) {
	for (const key in from) {
		to[key] = {
			rule: (from[key].rule !== null ? from[key].rule : (to[key] ? to[key].rule : null)),
			urls: (to[key] ? to[key].urls : {})
		};

		mergeRules(from[key].urls, to[key].urls);
	}
}

/**
 * @brief Saves the rule in the passed location
 *
 * Saves the rule in `tosave` at the specified site
 *
 * @param level  [Object] Current level in the preferences object
 * @param sites  [Array]  Url parts, order is the order it's
 * saved in preferences (domain, subdomain, page)
 * @param tosave [any]    Rule to save
 *
 * @note It replaces whatever is passed in `tosave`
 */
function saveRule(level, sites, tosave) {
	const address = sites.shift();

	// while there's an address we go on opening it
	if (address) {
		// create level if it does not exist
		if (!level.urls[address]) {
			level.urls[address] = {
				rule: null,
				rules: {urls: {}},
				urls: {}
			};
		}

		// move inside level
		saveRule(level.urls[address], sites, tosave);
		return;
	}

	// object is `rules` key, others (boolean/number) is `rule`
	if (typeof tosave !== "object") {
		level.rule = tosave;
	}
	else {
		mergeRules(tosave, level.rules.urls);
	}
}

/**
 * @brief Load settings in the passed location
 *
 * Loads the policy and script rules to apply into `applyRules`
 *
 * @param[in] level  [Object] Current level in the preferences object
 * @param[in] sites  [Array]  Url parts, order is the order it's
 * saved in preferences (domain, subdomain, page)
 *
 * @param[out] applyRules [Object] Contains rules to apply,
 * childs include `policy` containing policy rule and
 * `rules` containing blackwhitelist object.
 */
function loadRule(level, sites, applyRules) {
	if (level.rule !== null) {
		applyRules.policy = level.rule;
	}

	mergeRules(level.rules.urls, applyRules.rules);

	const address = sites.shift();

	if (address && level.urls[address]) {
		loadRule(level.urls[address], sites, applyRules);
	}
}

/**
 * @brief Get rules to apply
 *
 * Returns the blocking policy and blackwhitelist rules to be used
 *
 * @param site [Object] url object obtained from extractUrl()
 *
 * @return [Object] Contains rules to apply, child keys include
 * `policy` containing policy rule and `rules` containing
 * blackwhitelist
 */
function getRules(site) {
	const urls = [
		site.subdomain,
		site.page
	];

	// private windows must read from other object
	const rulesList = (site.private ? privatum.preferences : preferences);

	const applyRules = {
		policy: rulesList.rule,
		rules: {}
	};

	if (rulesList.urls[site.domain]) {
		loadRule(rulesList.urls[site.domain], urls, applyRules);
	}

	return applyRules;
}

/* ====================================================================== */

/**
 * @brief Deep clone JSON
 *
 * Deep clones JSON for preferences in private windows
 *
 * @param object [Object] JSON object to deep clone
 *
 * @return [Object] Cloned object
 *
 * @warning This does not deep clone any JS Object or JSON.
 * This function is optimised for the specifics of the
 * `preferences` JSON used in this project.
 */
function deepClone(object) {
	// if not an object then it's a value
	// just return it for the `for` below
	if (object === null || typeof (object) !== "object") {
		return object;
	}

	// if it's an object we need to initialise and copy keys
	const clone = object.constructor();

	for (const key in object) {
		clone[key] = deepClone(object[key]);
	}

	// returns cloned object
	return clone;
}

/**
 * @brief Create preferences for private browsing
 *
 * When a windows is created we check if it's a private one.
 * If it is and there is no other private windows we create a
 * private preferences object separated from the main preferences.
 *
 * @param details, [Object] Details about the new window
 */
function createPrivatePrefs(details) {
	if (details.incognito === true) {
		privatum.windows[details.id] = true;
		privatum.windows.length++;

		if (privatum.windows.length === 1) {
			privatum.preferences = deepClone(preferences);
			// put private rule into effective rule
			privatum.preferences.rule = privatum.preferences.private;
		}
	}
}

/**
 * @brief Listener for window creation event
 *
 * Fired whenever a new window opens
 */
chrome.windows.onCreated.addListener(createPrivatePrefs);

/**
 * @brief Check if private rules should be deleted
 *
 * When a window is closed we check if it's the last private
 * window, if it is we delete the private preferences object
 *
 * @param windowid [Number] ID of the closed window
 */
chrome.windows.onRemoved.addListener((windowid) => {
	if (privatum.windows[windowid] === true) {
		delete privatum.windows[windowid];
		privatum.windows.length--;

		if (privatum.windows.length === 0) {
			privatum = {
				windows: {length: 0},
				preferences: {}
			};
		}
	}
});

/* ====================================================================== */

/**
 * @brief Add info about tab
 *
 * Adds info about the tab into `tabStorage`. Can also be used to
 * update information for pages loaded dynamically.
 *
 * @param tab [Object] Holds information about the tab
 */
function addTab(tab) {
	// console.log("@addTab, Tab info", tab);

	if (tab.id === -1) {
		// console.warn("@addTab, Abort! tabid is -1");
		return;
	}

	// if first char not 'h' from http or https, just monitor for changes
	if (tab.url.charCodeAt(0) !== 104) {
		tabStorage[tab.id] = tab.url;
		return;
	}

	const tabStore = tabStorage[tab.id];
	const site     = extractUrl(tab.url);
	site.private   = tab.incognito;
	site.window    = tab.windowId;
	site.tabid     = tab.id;

	const block    = getRules(site);
	site.policy    = block.policy;
	site.rules     = block.rules;

	if (tabStore === undefined || tabStore.page === undefined) {
		site.blocked = 0;
		site.scripts = {};
		site.frames  = {};

		tabStorage[tab.id] = site;
		return;
	}

	if (!tabStore.allowonce) {
		// if page uses history.pushState the old scripts are still loaded
		site.blocked = tabStore.blocked;
		site.scripts = tabStore.scripts;
		site.frames  = tabStore.frames;

		tabStorage[tab.id] = site;
		return;
	}

	// allow all once
	if (tabStore.subdomain === site.subdomain && tabStore.domain === site.domain) {
		site.policy = 0;
		site.allowonce = true;

		chrome.browserAction.setBadgeText({
			text: "T",
			tabId: tab.id
		});

		chrome.browserAction.setBadgeBackgroundColor({
			color: jaegerhut[0].colour,
			tabId: tab.id
		});

		tabStorage[tab.id] = site;
	}
}

/**
 * @brief Remove info about tab
 *
 * Removes all information about the tab from `tabStorage`
 *
 * @param tabid     [Number]  id of the removed tab
 * @param allowonce [Boolean] if Allow Once policy is set
 */
function removeTab(tabid, allowonce) {
	// console.log("@removeTab, Stopped monitoring tab", tabid, "with", tabStorage[tabid]);
	if (allowonce === true) {
		tabStorage[tabid] = {
			allowonce: true,
			domain: tabStorage[tabid].domain,
			subdomain: tabStorage[tabid].subdomain
		};
		return;
	}

	delete tabStorage[tabid];
}

/**
 * @brief Remove tab info on close
 *
 * When a tab is closed stop monitoring it.
 *
 * @param tabid [Number] ID of the tab being closed
 */
chrome.tabs.onRemoved.addListener((tabid) => {
	removeTab(tabid, false);
});

/**
 * @brief Obtain info about tabs and windows
 *
 * Goes through all windows and tabs to create the appropriate
 * data for the extension.
 */
function getTabsAndWindows() {
	// check if private preferences must be created
	chrome.windows.getAll({populate: false}, (windows) => {
		windows.forEach((details) => {
			createPrivatePrefs(details);
		});
	});

	// get info and rules about open tabs
	chrome.tabs.query({}, (tabs) => {
		tabs.forEach((tab) => {
			addTab(tab);
		});
	});
}

/**
 * @brief Converts a single level to the new format
 *
 * Recursively calls itself if necessary until the whole tree
 * is converted. Data is not deleted, just created.
 *
 * @param[in]  domain [Object] The current level to convert
 *
 * @param[out] this   [Array]  Array containing two children:
 * - [Object]  Level to write the converted object
 * - [Boolean] If `rules` key must be included
 */
function convertLevel(domain) {
	const level = domain.sites || domain.pages;

	this[0].urls[domain.name] = {
		rule: (domain.rule !== undefined ? domain.rule : null),
		urls: {}
	};

	if (level) {
		level.forEach(convertLevel, [this[0].urls[domain.name], this[1]]);
	}

	if (this[1]) {
		this[0].urls[domain.name].rules = {urls: {}};

		if (domain.rules) {
			domain.rules.domains.forEach(convertLevel, [this[0].urls[domain.name].rules, false]);
		}
	}
}

/**
 * @brief Convert old preferences to new format
 *
 * Converts the old preferences format to the new unified format.
 * The Blackwhitelist object has already been moved inside the
 * `rules` key of the top level `preferences` object.
 */
function convertPreferences() {
	preferences.urls = {};
	preferences.domains.forEach(convertLevel, [preferences, true]);
	delete preferences.domains;

	preferences.rules.urls = {};
	preferences.rules.domains.forEach(convertLevel, [preferences.rules, false]);
	delete preferences.rules.domains;

	preferences.ping = false;

	chrome.storage.local.clear();
	chrome.storage.local.set({preferences: preferences});
}

/**
 * @brief Load default preferences
 *
 * Loads the default preferences and sets an update check.
 * Settings 
 */
function loadDefaultPreferences() {
	// the default preferences are in an external file for reducing the size and overhead of this background page
	const script = document.createElement("script");
	script.src = "default-prefs.js";
	script.type = "text/javascript";
	script.id = "default";
	document.head.appendChild(script);

	// alarm creates a permanent update check across restarts
	chrome.alarms.create("updateCheck", {
		delayInMinutes: 1, // first check after 1 minute
		periodInMinutes: 1440 // check for updates every 24 hours
	});
}

/**
 * @brief Load preferences
 *
 * Loads the preferences and convert them if necessary.
 * If no preferences exist it loads defaults.
 *
 * @param pref [Object] Loaded preferences
 *
 * @note This is fired on load
 */
chrome.storage.local.get((pref) => {
	// just load prefs if not first run and already converted
	if (pref.preferences !== undefined) {
		preferences = pref.preferences;
	}

	// this key only exists in the old preferences
	// if not here then it's first run
	else if (pref.firstRun === undefined) {
		loadDefaultPreferences();
	}

	// if not converted and there's a firstRun key we begin upgrade
	else {
		preferences = pref.policy;
		preferences.rules = pref.blackwhitelist;
		convertPreferences();
	}

	getTabsAndWindows();
});

/**
 * @brief Rename tabid on replacement
 *
 * Under Chromium tab processes can be replaced,
 * this moves the tab info to another id
 *
 * @param newId [Number] id of the new process
 * @param oldId [Number] id of the old process
 *
 * Based on https://github.com/Christoph142/Pin-Sites/
 */
chrome.tabs.onReplaced.addListener((newId, oldId) => {
	// console.log("@tabs.onReplaced,", oldId, "replaced by", newId);

	if (newId === oldId || tabStorage[oldId] === undefined) {
		return;
	}

	tabStorage[newId] = tabStorage[oldId];
	removeTab(oldId, false);
});

/**
 * @brief Update info on navigation
 *
 * This is only run when the content is not loaded using
 * history.pushState
 *
 * We reset the info when this occurs because the page was not
 * dynamically loaded and so the whole content was reloaded.
 *
 * This event is fired right before tabs.onUpdated
 *
 * @param details [Object] of the navigation
 */
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
	// console.log("############### onBeforeNavigate ###############\n", details);
	const tabid = details.tabId;
	const frameid = details.frameId;

	// we should not continue if we don't know from which tab the frame is coming
	if (tabid === -1) {
		// console.warn("@onBeforeNavigate: Abort! tabid is -1");
		return;
	}

	if (frameid === 0) {
		// delete anything about the tab because tabs.onUpdate will re-add
		removeTab(tabid, (tabStorage[tabid] ? tabStorage[tabid].allowonce : false));
	}
	// if frameId > 0 & url is about:blank
	else if (details.url.charCodeAt(0) === 97) {
		let pframeid = details.parentFrameId;

		// if not loaded from main frame, check where it was
		if (pframeid > 0) {
			const use = tabStorage[tabid].frames[pframeid].use;

			if (use !== undefined) {
				pframeid = use;
			}
		}

		// console.log("@onBeforeNavigate, tabid:", tabid, "frameid:", frameid, "tabStorage:", tabStorage[tabid]);

		// save frame information
		if (typeof(tabStorage[tabid]) !== "string") {
			tabStorage[tabid].frames[frameid] = {
				use: pframeid
			};
		}
	}
});

/**
 * @brief Update tab info and extension icon on tab loading
 *
 * Pages that have content loaded dynamically like Facebook or YouTube
 * can't have the counter and script list reset
 *
 * onUpdated updates all info about the page
 *
 * @param tabId      [Number] id of the tab
 * @param changeInfo [Object] changes to the state of the tab that was updated
 * @param tab        [Object] details about the tab
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "loading") {
		// console.log("@tabs.onUpdated, Loading status fired", tabId, changeInfo, tab);

		// set info
		addTab(tab);

		// set icon according to policy
		const policy = tabStorage[tabId].policy;

		chrome.browserAction.setIcon({
			path: {
				"19": `images/${jaegerhut[policy].name}19.png`,
				"38": `images/${jaegerhut[policy].name}38.png`
			},
			tabId: tabId
		});

		chrome.browserAction.setBadgeBackgroundColor({
			color: jaegerhut[policy].colour,
			tabId: tab.id
		});
	}
});

// =========================================================================

/**
 * @brief Returns the frame that is loading the object
 *
 * Frames don't follow the rules of the tab site, but the rules
 * that match the frame site. This function will return that
 * info so the resource can be analysed with the correct urls
 *
 * @note `use` key contains which frameid to use, if it does
 * not exist then we already are in the correct place
 *
 * @param frameid [Number] id of the frame
 * @param tabsite [Object] info about tab from `tabStorage`
 *
 * @return [Object] info about frame from `tabStorage`
 */
function getLoadingFrame(frameid, tabsite) {
	const framesite = tabsite.frames[frameid];

	if (framesite.use === undefined) {
		return framesite;
	}

	if (framesite.use === 0) {
		return tabsite;
	}

	return tabsite.frames[framesite.use];
}

/**
 * @brief Get if script is blocked
 *
 * Check if there's a blackwhitelist rule for that site and
 * returns the rule.
 *
 * @param level [Object] where to check for the rule
 * @param site  [Object] object containinig domain and subdomain keys
 *
 * @return [Null/Boolean] Rule under that level
 */
function getScriptRule(level, site) {
	let block = null;
	level = level[site.domain];

	if (level) {
		block = level.rule;
		level = level.urls[site.subdomain];

		if (level && level.rule !== null) {
			block = level.rule;
		}
	}

	return block;
}

/**
 * @brief Check if resource is blocked
 *
 * Checks if script is blocked according to policy and rules
 *
 * @param tabsite    [Object] urls of the tab
 * @param scriptsite [Object] urls of the loading resource
 * @param policy     [Number] policy being applied
 *
 * @return [Boolean] If resource is blocked
 */
function isScriptAllowed(tabsite, scriptsite, policy) {
	// allow all policy
	if (policy === 0) {
		return false;
	}

	// block all policy
	if (policy === 3) {
		return true;
	}

	// we start blocking to then check if we allow
	let block = true;

	// allow same domain
	if (scriptsite.domain === tabsite.domain) {
		block = false;
	}
	// relaxed policy - helper scripts also allowed
	else if (policy === 1 && (isCommonHelpers(scriptsite) || isRelated(scriptsite.domain, tabsite.domain))) {
		block = false;
	}

	// global blackwhitelist
	const level = (tabsite.private ? privatum.preferences : preferences);
	let blocked = getScriptRule(level.rules.urls, scriptsite);

	if (blocked !== null) {
		block = blocked;
	}

	// custom rules for the domain/site/page
	blocked = getScriptRule(tabsite.rules, scriptsite);

	if (blocked !== null) {
		block = blocked;
	}

	return block;
}

/**
 * @brief Update the icon number
 *
 * Updates the number in the extension icon and keeps track of all
 * resources blocked and allowed to populate the popup when needed.
 *
 * @param block      [Boolean] if resource was blocked
 * @param tabsite    [Object]  urls of the tab
 * @param scriptsite [Object]  urls of the loading resource
 * @param tabid      [Number]  ID of the tab
 * @param frameid    [Number]  ID of the frame
 * @param subframe   [Boolean] if resource is a subframe
 */
function updateUI(block, tabsite, scriptsite, tabid, frameid, subframe) {
	// set badge icon
	if (block) {
		tabsite.blocked++;

		// no frame contains this key
		if (tabsite.private === undefined) {
			tabStorage[tabid].blocked++;
		}

		chrome.browserAction.setBadgeText({
			text: tabStorage[tabid].blocked.toString(),
			tabId: tabid
		});
	}

	// send info about the scripts to the popup
	/*chrome.runtime.sendMessage({
		site: scriptsite,
		blocked: block,
		tabid: tabid
	});*/

	// save info about loaded scripts or frame
	const script = tabsite.scripts;
	const scriptInfo = {
		name: scriptsite.page,
		query: scriptsite.query,
		protocol: scriptsite.protocol,
		blocked: block
	};

	// save info about frame
	if (subframe) {
		// add frameId on sub_frame
		scriptInfo.frameid = frameid;

		// save frame info in another area
		const frameInfo    = scriptsite;
		scriptsite.private = tabsite.private;
		const sitePolicies = getRules(scriptsite);
		frameInfo.policy   = sitePolicies.policy;
		frameInfo.rules    = sitePolicies.rules;
		frameInfo.blocked  = 0;
		frameInfo.scripts  = {};
		tabStorage[tabid].frames[frameid] = frameInfo;
	}

	// console.log("@scriptweeder, Saving domain", script[scriptsite.domain])
	if (script[scriptsite.domain] === undefined) {
		script[scriptsite.domain] = {};
	}

	if (script[scriptsite.domain][scriptsite.subdomain] === undefined) {
		script[scriptsite.domain][scriptsite.subdomain] = [scriptInfo];
	}
	else {
		script[scriptsite.domain][scriptsite.subdomain].push(scriptInfo);
	}
}

/**
 * @brief The Script Weeder - Evaluate if resource can be downloaded
 *
 * This is the main function that is run on every request made.
 *
 * @param details [Object] Info about the resource
 *
 * @return [Object] If resource must be blocked
 */
function scriptweeder(details) {
	// console.log("============== ", details.type, " intercepted ==============");
	// console.log(details);

	const tabid = details.tabId;

	if (tabStorage[tabid] === undefined) {
		if (tabid !== -1) {
			console.warn("@scriptweeder, tabStorage was not found!", tabid);
		}
		return {cancel: false};
	}

	const scriptsite = extractUrl(details.url);
	let tabsite      = tabStorage[tabid];
	const frameid    = details.frameId;
	let subframe     = false;

	// if request comes from sub_frame or is a sub_frame
	if (frameid > 0) {
		// if request is a sub_frame
		if (details.type === "sub_frame") {
			subframe = true;
			const pframeid = details.parentFrameId;

			if (pframeid > 0) {
				tabsite = getLoadingFrame(pframeid, tabsite);
			}
		}

		// console.log("@scriptweeder, Is sub_frame?", subframe, "\nParent frame ID", pframeid);
		// if request comes from a sub_frame we apply the rules from the frame site
		if (!subframe) {
			tabsite = getLoadingFrame(frameid, tabsite);
		}
	}

	// console.log("@scriptweeder, Script website", scriptsite);
	// console.log("@scriptweeder, Website loading script", tabsite);

	// get if resource must be blocked or not
	const block = isScriptAllowed(tabsite, scriptsite, tabsite.policy);

	updateUI(block, tabsite, scriptsite, tabid, frameid, subframe);

	// console.log("@scriptweeder, Script blocked:", block);
	// cancel: true - blocks loading, false - allows loading
	return {cancel: block};
}

/**
 * @brief Resources and protocols to be evaluated
 *
 * Here we tell the webRequest API which protocols and resource types
 * need to be evaluated by the scriptweeder before the request is made
 */
chrome.webRequest.onBeforeRequest.addListener(
	scriptweeder,
	{
		urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*", "file://*/*"],
		types: ["script", "sub_frame", "websocket"]
	},
	["blocking"]
);

/**
 * @brief Block ping requests
 *
 * Block ping requests to reduce tracking.
 *
 * @note Ping requests are global, less branches in scriptweeder.
 */
chrome.webRequest.onBeforeRequest.addListener(
	() => {
		return {cancel: preferences.ping !== true};
	},
	{
		urls: ["http://*/*", "https://*/*"],
		types: ["ping"]
	},
	["blocking"]
);

/**
 * @brief Redirect http://ScriptJäger urls to preferences merging
 *
 * Gets URLs that match `https?://ScriptJ(ä|ae)ger/.*` and redirects
 * them to the preferences page for merging preferences.
 *
 * The snippet to be merged is added as the path of the URL.
 *
 * This redirection allows sharing preferences between any browser.
 */
chrome.webRequest.onBeforeRequest.addListener(
	(details) => {
		const url = `${chrome.runtime.getURL("prefs.html")}?${details.urls.substring(details.urls.search(/\w\//) + 2)}`;
		return {redirectUrl: url};
	},
	{
		urls: ["http://ScriptJäger/*", "http://ScriptJaeger/*", "https://ScriptJäger/*", "https://ScriptJaeger/*"],
		types: ["main_frame"]
	},
	["blocking"]
);

// =========================================================================

/**
 * @brief Perform actions acording to message
 *
 * The popup and the preferences page might require info or things
 * to be executed.
 *
 * Child 'type' will contain the type of the request
 *
 * @param msg [Object] Contains type and data for the action
 *
 * @note Each request has different msg children/info
 *
 * 0 Change blackwhitelist
 *   - private [Boolean] Is private browsing?
 *   - rule    [Boolean] If script is blocked or allowed
 *   - rule    [Number]  New policy rule
 *   - script  [Array]   Contains urls of the script to apply rule
 *     - domain    [String] Host script being allowed or blocked
 *     - subdomain [String] host script being allowed or blocked
 *   - site    [Array]   Contains urls where to apply, all optional
 *     - domain    [String] Host to save policy
 *     - subdomain [String] Subdomain to save policy
 *     - page      [String] Dir+filename to save policy
 * 
 * 1 Allow all scripts once (do not save)
 *   - tabId [Number]  id of the tab to allow once
 *   - allow [Boolean] Enable/disable allow once
 *
 * 2 Popup requesting allowed/blocked list for relaxed/filtered
 *   - policy  [Number] Block policy
 *   - tabid   [Number] id of the requested tab
 *   - frameid [Number] id of frame that had its policy changed
 *   - window  [Number] id of the window the tab is from
 *
 * 3 New preferences from preferences page
 *   - prefs [Object] New preferences
 */
function processMessage(msg) {
	console.log("@@@@@@@@@@@@@@@ Message Received @@@@@@@@@@@@@@@\n", msg);

	switch (msg.type) {
		// save a rule
		case 0: {
			const level = (msg.private ? privatum.preferences : preferences);

			saveRule(level, msg.site, msg.rule);

			if (!msg.private) {
				chrome.storage.local.set({preferences: preferences});
			}
			break;
		}

		// allow once
		case 1: {
			tabStorage[msg.tabId].allowonce = msg.allow;
			chrome.tabs.reload(msg.tabId, {bypassCache: !msg.allow});
			break;
		}

		// popup requests to check which scripts are blocked when on filtered or relaxed
		case 2: {
			const scriptslist = [];
			let frame = tabStorage[msg.tabid];

			if (msg.frameid > 0) {
				frame = frame.frames[msg.frameid];
			}

			Object.entries(frame.scripts).forEach((domain) => {
				Object.keys(domain[1]).forEach((subdomain) => {
					scriptslist.push({
						name: `${subdomain}${domain[0]}${msg.frameid}`,
						blocked: isScriptAllowed(frame, {domain: domain[0], subdomain: subdomain}, msg.policy)
					});
				});
			});

			ports[msg.window].postMessage({
				type: 2,
				tabid: msg.tabid,
				scripts: scriptslist
			});
			break;
		}

		case 3: {
			preferences = msg.prefs;
			break;
		}

		default:
	}
}

/**
 * @brief Listener for normal messages
 *
 * Fired only from preferences page sending the new modified settings
 */
chrome.runtime.onMessage.addListener(processMessage);

/**
 * @brief Exchange information with popup page
 *
 * We keep a channel open with the popup page so we can update it on
 * realtime.
 */
chrome.runtime.onConnect.addListener((port) => {
	port.postMessage({
		type: 0,
		data: tabStorage[port.name]
	});

	const windowid = tabStorage[port.name].window;
	ports[windowid] = port;

	port.onDisconnect.addListener(() => {
		delete ports[windowid];
	});

	port.onMessage.addListener(processMessage);
});

/**
 * @brief Update popup on changing tabs
 *
 * When the active tab is changed this function is fired.
 * If a port is open it means some popup interface is running,
 * in this case we send the information about the tab to it.
 *
 * The message sent has a key `type` with value `0`, key `data`
 * contains `tabStorage` data.
 */
chrome.tabs.onActivated.addListener((active) => {
	const port = ports[active.windowId];

	// don't send if no ports are open
	if (port === undefined) {
		return;
	}

	port.postMessage({
		type: 0,
		data: tabStorage[active.tabId]
	});
});
