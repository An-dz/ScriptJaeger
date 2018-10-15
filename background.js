"use strict";

/*
 * Object that holds preferences
 *
 * Block policy (rule key):
 *
 * 0 Allowed - All scripts allowed, white(black)list doesn't run
 * 1 Relaxed - Scritps from same domain & helpers are allowed
 * 2 Filtered - Only from the same domain allowed
 * 3 Blocked - All scripts blocked, white(black)list doesn't run
 * 4	Block injected - Inline script is blocked
 * 5	Pretend disabled - Pretend scripts are blocked (load noscript tags)
 */
var policy = {};

/*
 * Whitelist & Blacklist, rule key defines if it's white or black listed
 * false: allowed/whitelist | true: blocked/blacklist
 */
var blackwhitelist = {};

/*
 * Objects that holds info about the open tabs
 */
var tabStorage = {};

/*
 * Holds all preferences on private browsing
 *
 * It's only filled when required and is cleared when no longer
 *
 * windows key holds the number of open private windows and their ids
 */
var privateRules = {
	windows: {length: 0},
	policy: {},
	blackwhitelist: {}
};

/*
 * Badge icons, one for each policy
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

/*
 * Called when the default preferences file is loaded so they are saved
 */
function defaultPreferencesLoaded() {
	chrome.storage.local.set({policy: policy, blackwhitelist: blackwhitelist, firstRun: false});

	// remove the injected script
	document.head.removeChild(document.getElementById("default"));
}

/*
 * Clicking on the update notification will open the GitHub releases
 */
chrome.notifications.onClicked.addListener(function (notification) {
	chrome.tabs.create({
		url: "https://github.com/An-dz/ScriptJaeger/releases"
	});
	chrome.notifications.clear(notification);
});

/*
 * A created alarm will check for updates regularly
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
	xhr.open("GET", "https://raw.githubusercontent.com/An-dz/ScriptJaeger/master/manifest.json?time=" + Date.now());
	xhr.send();
});

/* ======================================================================
 * Relaxed mode functions and variables, default values based from
 * ScriptWeeder https://github.com/lemonsqueeze/scriptweeder
 * ====================================================================== */

/*
 * List of standard second level domains
 */
const standardSecondLevelDomains = { "com": 1, "org": 1, "net": 1, "gov": 1, "co": 1, "info": 1, "ac": 1, "or": 1, "tm": 1, "edu": 1, "mil": 1, "sch": 1, "int": 1, "nom": 1, "biz": 1, "gob": 1, "asso": 1 };

/*
 * From http://publicsuffix.org
 * The standard above and long constructions are omitted
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

/*
 * Relaxed mode
 * Check if we can allow from some common patterns in the url
 */
function isCommonHelpers(site) {
	if (site.subdomain !== "s"               &&
	    site.subdomain.indexOf("tag") === -1 && (
	    site.domain.indexOf("apis")     > -1 ||
	    site.domain.indexOf("cdn")      > -1 ||
	    site.domain.indexOf("img")      > -1 ||
	    site.domain.indexOf("static")   > -1 ||
	    site.subdomain.indexOf("login") > -1 ||
	    site.subdomain.indexOf("code") === 0 ||
	    site.domain === "google.com"            )
	) {
		return true;
	}
	return false;
}

/*
 * Relaxed mode
 * Check if the domain name of the site is in the domain of the script
 * If tab domain is bigger, search for the inverse
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

/*
 * Extract the important parts of the url and returns an object with them
 *
 * Object children:
 * protocol = contains the protocol http or https
 * subdomain = contains the subdomain name
 * domain = contains the domain name
 * page = contains the directory & file name
 * query = contains query information
 */
function extractUrl(url) {
	/*
	 * Obtain the important parts of the url to load settings
	 * 0 contains the full url (because it's the match of the full regexp)
	 * 1 contains the protocol
	 * 2 contains the hostname (subdomain + domain)
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

/*
 * Function that *saves* or *loads* a rule in the correct place
 * 
 * subject, array to search in
 * names, array of strings to find; order like prefs (domain, site, page)
 * lvl, level of the search; the function itself may call the next levels
 * rule, the rule to save; `undefined` for loading
 */
const lvlName = ["domains", "sites", "pages"];
function saveLoadRule(subject, names, lvl, rule) {
	let level;

	if (subject[lvlName[lvl]] !== undefined) {
		level = subject[lvlName[lvl]].find(function (level) {
			if (level.name === names[lvl]) {
				return level;
			}
		});
	}

	// only if saving
	if (rule !== undefined) {
		// if not in the `subject` we add it
		if (level === undefined) {
			level = {name: names[lvl]};
			subject[lvlName[lvl]].push(level);
		}

		// if next name does not exist we save here
		if (names[++lvl] === undefined) {
			if (typeof(rule) === "object") {
				if (level.rules === undefined) {
					level.rules = {domains: []};
				}

				return saveLoadRule(level.rules, rule.names, 0, rule.rule);
			}

			level.rule = rule;
			return true; // saved
		}

		// if next level does not exist we create it
		if (level[lvlName[lvl]] === undefined) {
			level[lvlName[lvl]] = [];
		}

		return saveLoadRule(level, names, lvl, rule);
	}

	// level does not exist
	if (level === undefined) {
		if (lvl === 0) {
			return false;
		}
		// return previous level if not first
		return subject;
	}

	let mergedLevel = level;
	if (lvl > 0) {
		mergedLevel = Object.assign({rule: subject.rule, rules: subject.rules}, level);
	}

	if (names[++lvl] !== undefined) {
		return saveLoadRule(mergedLevel, names, lvl, rule);
	}
	return mergedLevel;
}

/*
 * Returns the blocking policy to be used
 */
function getBlockPolicy(site) {
	// console.log("@getBlockPolicy, site", site);
	// begin with default policy
	let applyPolicy = policy.rule;

	let siteRules;
	let applyRules;
	const sites = [
		site.domain,
		site.subdomain,
		site.page
	];

	// search if setting for this site exists
	if (site.private === true) {
		// private windows can have a different default
		applyPolicy = privateRules.policy.private;
		siteRules = saveLoadRule(privateRules.policy, sites, 0, undefined);
	}
	else {
		siteRules = saveLoadRule(policy, sites, 0, undefined);
	}

	if (siteRules !== false) {
		if (siteRules.rule !== undefined) {
			applyPolicy = siteRules.rule;
		}
		applyRules = siteRules.rules;
	}

	// return the policy that has to be applied & any custom rules
	return {policy: applyPolicy, rules: applyRules};
}

/* ====================================================================== */

/*
 * When a windows is created we check if it's a private one
 * If it is and there is no other private window we create a
 * private preferences object apart from the main preferences
 */
function createPrivatePrefs(details) {
	if (details.incognito === true) {
		privateRules.windows[details.id] = true;
		privateRules.windows.length++;

		if (privateRules.windows.length === 1) {
			// console.log("@createPrivatePrefs, First private window created");
			privateRules.policy = JSON.parse(JSON.stringify(policy));
			privateRules.blackwhitelist = JSON.parse(JSON.stringify(blackwhitelist));
		}
	}
}

/*
 * Listener for window creation event
 */
chrome.windows.onCreated.addListener(createPrivatePrefs);

/*
 * When a windows is closed we check if it's the last private
 * window, if it is we delete the private preferences object
 */
chrome.windows.onRemoved.addListener(function (windowid) {
	if (privateRules.windows[windowid] === true) {
		delete privateRules.windows[windowid];
		privateRules.windows.length--;

		if (privateRules.windows.length === 0) {
			// console.log("@windows.onRemoved, Last private window closed");
			privateRules = {
				windows: {length: 0},
				policy: {},
				blackwhitelist: {}
			};
		}
	}
});

/* ====================================================================== */

/*
 * Function to save info about tab
 */
function addTab(tab) {
	// console.log("@addTab, Tab info", tab);
	if (tab.id === -1) {
		// console.info("@addTab, Abort! tabid is -1");
		return;
	}

	// if first char not 'h' from http or https, just monitor for changes
	if (tab.url.charCodeAt(0) !== 104) {
		tabStorage[tab.id] = tab.url;
	}
	else {
		const tabStore = tabStorage[tab.id];
		const site = extractUrl(tab.url);
		site.private = tab.incognito;

		if (tabStore !== undefined && tabStore.allowonce === true && tabStore.subdomain === site.subdomain && tabStore.domain === site.domain) {
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
		}
		else {
			const block = getBlockPolicy(site);
			site.policy = block.policy;
			site.rules = block.rules;
		}

		if (tabStore === undefined || tabStore.page === undefined) {
			site.numScripts = 0;
			site.scripts = {};
			site.frames = {};
		}
		// if page uses history.pushState the old scripts are still loaded
		else {
			site.numScripts = tabStore.numScripts;
			site.scripts = tabStore.scripts;
			site.frames = tabStore.frames;
		}

		tabStorage[tab.id] = site;
	}

	// console.log("@addTab, Monitoring tab", tab.id, "with", tabStorage[tab.id]);
}

/*
 * Function to remove saved info about tab
 */
function removeTab(tabid, allowonce = false) {
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

/*
 * When a tab is closed, stop monitoring
 */
chrome.tabs.onRemoved.addListener(removeTab);

/*
 * Obtain preferences & monitor current tabs
 *
 * Fired on load
 */
chrome.storage.local.get(function (pref) {
	// on first run the key does not exist
	if (pref.firstRun === undefined) {
		// console.log("@storage.get, First Run! Loading defaults!");

		// the default preferences are in an external file for reducing the size of this background page
		const script = document.createElement("script");
		script.src = "default-prefs.js";
		script.type = "text/javascript";
		script.id = "default";
		document.head.appendChild(script);

		// alarm creates a permanent check across restarts
		chrome.alarms.create("updateCheck", {
			delayInMinutes: 1, // first check after 1 minute
			periodInMinutes: 1440 // check for updates every 24 hours
		});
	}
	else {
		// not first run just load prefs
		policy = pref.policy;
		blackwhitelist = pref.blackwhitelist;
		// console.log("@storage.get, Loaded preferences", {policy: policy, blackwhitelist: blackwhitelist});
	}

	// console.log("@storage.get, Initialising...");
	chrome.tabs.query({}, function (tabs) {
		tabs.forEach(function (tab) {
			addTab(tab);
		});
	});

	chrome.windows.getAll({populate: false}, function (windows) {
		windows.forEach(function (details) {
			createPrivatePrefs(details);
		});
	});
});

/*
 * Monitoring the tabs to get their urls
 * Based on https://github.com/Christoph142/Pin-Sites/
 */
chrome.tabs.onReplaced.addListener(function (newId, oldId) {
	// console.log("@tabs.onReplaced,", oldId, "replaced by", newId);
	if (newId === oldId || tabStorage[oldId] === undefined) {
		return;
	}

	tabStorage[newId] = tabStorage[oldId];
	removeTab(oldId, false);
});

/*
 * This is only run when the content is not loaded using history.pushState
 * We reset the info when this occurs because the page was not dynamically
 * loaded and so the whole content was reloaded.
 *
 * This event is fired right before tabs.onUpdated
 */
chrome.webNavigation.onBeforeNavigate.addListener(function (details) {
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

/*
 * Pages that have content loaded dynamically like Facebook or YouTube
 * can't have the counter and script list reset
 *
 * onUpdated updates all info about the page
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status === "loading") {
		// console.log("@tabs.onUpdated, Loading status fired", tabId, changeInfo, tab);

		// set info
		addTab(tab);

		// set icon according to policy
		const applyPolicy = tabStorage[tabId].policy;

		chrome.browserAction.setIcon({
			path: {
				"19": "images/" + jaegerhut[applyPolicy].name + "19.png",
				"38": "images/" + jaegerhut[applyPolicy].name + "38.png"
			},
			tabId: tabId
		});

		chrome.browserAction.setBadgeBackgroundColor({
			color: jaegerhut[applyPolicy].colour,
			tabId: tab.id
		});
	}
});

// =========================================================================

/*
 * Returns the frame that is loading the object
 *
 * use key contains which frameid to use
 * if it does not exist then we already are in the correct place
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

/*
 * Check if script is allowed when on filtered or relaxed policies
 */
function isScriptAllowed(block, tabsite, scriptsite, applyPolicy) {
	// allow same domain
	if (scriptsite.domain === tabsite.domain) {
		block = false;
	}
	// relaxed policy - helper scripts also allowed
	else if (applyPolicy === 1 && (isCommonHelpers(scriptsite) || isRelated(scriptsite.domain, tabsite.domain))) {
		block = false;
	}

	const scriptsiteUrl = [
		scriptsite.domain,
		scriptsite.subdomain
	];

	let blackwhitelistObj = blackwhitelist;
	if (tabsite.private === true) {
		blackwhitelistObj = privateRules.blackwhitelist;
	}
	// whitelist & blacklist, it's one single list, rule key defines it
	let siteRules = saveLoadRule(blackwhitelistObj, scriptsiteUrl, 0, undefined);

	if (siteRules !== false && siteRules.rule !== undefined) {
		block = siteRules.rule;
	}

	// custom rules for the domain/site/page
	if (tabsite.rules !== undefined) {
		siteRules = saveLoadRule(tabsite.rules, scriptsiteUrl, 0, undefined);
		if (siteRules !== false && siteRules.rule !== undefined) {
			block = siteRules.rule;
		}
	}

	return block;
}

/*
 * The Script Weeder, will evaluate if the script can be downloaded
 */
function scriptweeder(details) {
	// console.log("============== Script intercepted ==============");
	// console.log(details);

	const tabid = details.tabId;
	if (tabStorage[tabid] === undefined) {
		console.warn("@scriptweeder, tabStorage was not found!", tabid);
		return {cancel: false};
	}

	const scriptsite = extractUrl(details.url);
	let tabsite = tabStorage[tabid];
	const frameid = details.frameId;
	let subframe = false;

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

	// begin assuming it's block all
	let block = true;
	const applyPolicy = tabsite.policy;
	// console.log("@scriptweeder, Block Policy:", applyPolicy);

	// allow all policy
	if (applyPolicy === 0) {
		block = false;
	}
	// relaxed or filtered policies
	else if (applyPolicy === 1 || applyPolicy === 2) {
		block = isScriptAllowed(block, tabsite, scriptsite, applyPolicy);
	}

	// set badge icon
	if (block) {
		tabsite.numScripts++;

		// no frame contains this key
		if (tabsite.private === undefined) {
			tabStorage[tabid].numScripts++;
		}

		chrome.browserAction.setBadgeText({
			text: tabStorage[tabid].numScripts.toString(),
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
		const frameInfo = scriptsite;
		scriptsite.private = tabsite.private;
		const sitePolicies = getBlockPolicy(scriptsite);
		frameInfo.policy = sitePolicies.policy;
		frameInfo.rules = sitePolicies.rules;
		frameInfo.numScripts = 0;
		frameInfo.scripts = {};
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

	// console.log("@scriptweeder, Script blocked:", block);
	// cancel: true - blocks loading, false - allows loading
	return {cancel: block};
}

/*
 * Chromium webRequest, we check before the request is made
 * We just need to check from http protocol and only scripts and frames
 */
chrome.webRequest.onBeforeRequest.addListener(
	scriptweeder,
	{
		urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*", "file://*/*"],
		types: ["script", "sub_frame", "websocket"]
	},
	["blocking"]
);

// =========================================================================

/*
 * The popup might require info or things to be executed
 * child 'type' will contain the type of the request
 * each request has different msg childs/info
 *
 * 0 Request tab information
 *   tabid, the id of the requested tab
 * 
 * 1 Change blackwhitelist
 *   private, if it comes from private browsing
 *   rule, new script rule for that domain
 *   script [
 *     domain, of the script being allowed or blocked
 *     subdomain, of the script being allowed or blocked
 *   ]
 *   site [
 *     domain, of the page to change the rule
 *     subdomain, of the page to change the rule
 *     page, name of the page to change the rule
 *   ]
 * 
 * 2 Change policy
 *   private, if it comes from private browsing
 *   policy, the new policy rule
 *   site [
 *     domain, of the page to change the rule
 *     subdomain, of the page to change the rule
 *     page, name of the page to change the rule
 *   ]
 * 
 * 3 New preferences from preferences page
 *   newPrefs, can contain either `policy` or `blackwhitelist`
 *
 * 4 Allow all scripts once (do not save)
 *   tabId, id of the tab to allow once
 *   allow, enable/disable allow once
 *
 * 5 Popup requesting allowed/blocked list for relaxed/filtered
 *   policy, block policy number
 *   tabid, the id of the requested tab
 *   frameid, the id of frame that had its policy changed
 */
chrome.runtime.onMessage.addListener(function (msg, src, answer) {
	// console.log("@@@@@@@@@@@@@@@ Message Received @@@@@@@@@@@@@@@\n", msg);

	// tab data request
	if (msg.type === 0) {
		answer(tabStorage[msg.tabid]);
	}

	// save individual scripts (blackwhitelist)
	else if (msg.type === 1) {
		// global scope, save in blackwhitelist
		if (msg.site[0] === undefined) {
			// console.log("@onMessage, blackwhitelist applied!", blackwhitelist)
			if (msg.private === true) {
				saveLoadRule(privateRules.blackwhitelist, msg.script, 0, msg.rule);
				return;
			}

			saveLoadRule(blackwhitelist, msg.script, 0, msg.rule);
			chrome.storage.local.set({blackwhitelist: blackwhitelist});
			// console.log("@onMessage, Saved blackwhitelist!");
			return;
		}

		const bwlist = {
			names: msg.script,
			rule: msg.rule
		};

		// console.log("@onMessage, b&w list was saved for", msg.site, "!");
		if (msg.private === true) {
			saveLoadRule(privateRules.policy, msg.site, 0, bwlist);
			return;
		}

		saveLoadRule(policy, msg.site, 0, bwlist);
		chrome.storage.local.set({policy: policy});
		// console.log("@onMessage, Policy object was saved!");
	}

	// save policy preferences
	else if (msg.type === 2) {
		// console.log("@onMessage, Applied new policy!", policy);
		// save global
		if (msg.site[0] === undefined) {
			if (msg.private === true) {
				privateRules.policy.private = msg.policy;
				return;
			}

			policy.rule = msg.policy;
		}
		else {
			if (msg.private === true) {
				saveLoadRule(privateRules.policy, msg.site, 0, msg.policy);
				return;
			}

			saveLoadRule(policy, msg.site, 0, msg.policy);
		}
		// console.log("@onMessage, Saved new policy!");
		chrome.storage.local.set({policy: policy});
	}

	// preferences page changes
	else if (msg.type === 3) {	
		if (msg.newPrefs.policy !== undefined) {
			policy = msg.newPrefs.policy;
			// console.log("@onMessage, Policy received from prefs page committed!\n", policy);
		}

		if (msg.newPrefs.blackwhitelist !== undefined) {
			blackwhitelist = msg.newPrefs.blackwhitelist;
			// console.log("@onMessage, Blackwhitelist received from prefs page committed!\n", blackwhitelist);
		}
	}

	// allow once
	else if (msg.type === 4) {
		tabStorage[msg.tabId].allowonce = msg.allow;
		chrome.tabs.reload(msg.tabId, {bypassCache: !msg.allow});
	}

	// popup requests to check which scripts are blocked when on filtered or relaxed
	else if (msg.type === 5) {
		const scriptslist = [];
		let frame = tabStorage[msg.tabid];

		if (msg.frameid > 0) {
			frame = frame.frames[msg.frameid];
		}

		Object.entries(frame.scripts).forEach(function (domain) {
			Object.keys(domain[1]).forEach(function (subdomain) {
				scriptslist.push({
					name: subdomain + domain[0] + msg.frameid,
					blocked: isScriptAllowed(true, frame, {domain: domain[0], subdomain: subdomain}, msg.policy)
				});
			});
		});

		answer({scripts: scriptslist});
	}
});
