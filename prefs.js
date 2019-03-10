"use strict";

/**
 * @var preferences [Object] JSON that holds preferences
 *
 * @see background.js
 * @see default-prefs.js
 * @see https://github.com/An-dz/ScriptJaeger/wiki/Dev:-Preferences
 */
let preferences = {};

/**
 * @var jaegerhut [Object] Badge icons, one for each policy
 */
const jaegerhut = {
	0: {
		offset: 1,
		name: "allowall",
		text: chrome.i18n.getMessage("policyAllowAll")
	},
	1: {
		offset: 2,
		name: "relaxed",
		text: chrome.i18n.getMessage("policyRelaxed")
	},
	2: {
		offset: 3,
		name: "filtered",
		text: chrome.i18n.getMessage("policyFiltered")
	},
	3: {
		offset: 4,
		name: "blockall",
		text: chrome.i18n.getMessage("policyBlockAll")
	},
	true: {
		offset: 2,
		name: "blacklist",
		text: chrome.i18n.getMessage("settingsRulesBlack")
	},
	false: {
		offset: 1,
		name: "whitelist",
		text: chrome.i18n.getMessage("settingsRulesWhite")
	},
	null: {
		offset: 0,
		name: "undefined",
		text: chrome.i18n.getMessage("settingsRulesNone")
	}
};

/**
 * @brief Save settings and tell background script about it
 *
 * Saves the new settings and then send them to the background
 * script so it's aware of changes and can replace them right away
 *
 * As the message API is async the saving might not be in the same
 * order as the functions are called, so a timeout is implemented to
 * reduce the calls to the background page and the storage API.
 */
function saveAndAlertBackground() {
	clearTimeout(window.saveDelay);

	// enable if received true, keep true if received false
	window.saveDelay = setTimeout(() => {
		// send message to background
		chrome.runtime.sendMessage({
			type: 3, // alert of preferences changes
			prefs: preferences
		});

		// save preferences
		chrome.storage.local.set({preferences: preferences});
	}, 500);
}

/* ====================================================================== */

/**
 * @brief Display an alert box
 *
 * Shows an alert box in the middle of the page
 *
 * @param title [String] Title of the alert box
 * @param msg   [String] Message of the alert box (can be html)
 */
function showAlert(title, msg) {
	const alertbox = document.getElementById("alertbox");
	alertbox.className = "visible";
	alertbox.querySelector("h3").textContent = title;
	alertbox.querySelector("p").innerHTML = msg;
}

/**
 * @brief Open rule selector
 *
 * Opens a 'dropdown' to allow changing the policy on the specified
 * level
 *
 * @param e [Event] Event interface on the clicked DIV
 */
function openRuleSelector(e) {
	const dropdown = document.getElementById("dropdown");
	const rule     = jaegerhut[e.target.dataset.rule];
	const div      = e.target.parentNode;
	const li       = div.parentNode;
	const pos      = div.getBoundingClientRect();

	pos.y = pos.y + window.scrollY - (rule.offset * document.querySelector("li").offsetHeight);

	// console.log("Moving dropdown to position! X:", e.target.offsetLeft, "Y:", pos.y);

	dropdown.style = "top:" + pos.y + "px;left:" + e.target.offsetLeft + "px";

	// info for updating rule
	// rule levels
	for (const key in li.dataset) {
		dropdown.dataset[key] = li.dataset[key];
	}

	// highlight selected
	dropdown.querySelectorAll("input").forEach((n) => {
		n.removeAttribute("checked");
	});

	document.getElementById(rule.name).setAttribute("checked", true);

	// hide options that are not possible
	if (li.dataset.scriptdomain) {
		dropdown.className = "bwl";
	}
	else {
		dropdown.className = "policy";
	}

	e.target.id = "active";
}

/**
 * @brief Toggle sublevel rules
 *
 * Opens or closes the viewing of sublevel rules, like scripts or
 * subdomain rules.
 *
 * @param e [Event] Event interface on the clicked DIV
 */
function toggleSubLevel(e) {
	const li = e.target.parentNode;

	if (!li.hasAttribute("class")) {
		li.className = "show";
	}
	else {
		li.removeAttribute("class");
		li.querySelectorAll("li.show").forEach((node) => {
			node.removeAttribute("class");
		});
	}
}

/**
 * @brief Delete rule
 *
 * Deletes the rules where the X button was pressed
 *
 * @param e [Event] Event interface on the clicked X button
 */
function deleteRule(e) {
	// nodes
	const div = e.target.parentNode;
	const li  = div.parentNode;
	const ul  = li.parentNode;
	const liP = ul.parentNode;

	// rule levels
	const site = [
		li.dataset.domain,
		li.dataset.subdomain,
		li.dataset.page
	];

	// script levels
	const script = [
		li.dataset.scriptdomain,
		li.dataset.scriptsubdomain
	];

	let level = preferences;
	let i = 0;

	// walk through the levels
	while ((script[0] && site[i] !== undefined) || site[i + 1] !== undefined) {
		level = level.urls[site[i++]];
	}

	// if it's a script rule (rules object)
	if (script[0]) {
		level = level.rules;

		// if script rule has a sublevel
		if (script[1] !== undefined) {
			delete level.urls[script[0]].urls[script[1]];
		}
		else {
			delete level.urls[script[0]];
		}
	}
	else {
		delete level.urls[site[i]];
	}

	// now that the rule has been deleted time to deal with the DOM
	const isRules = (script[0] && script[1] === undefined);
	const number = liP.querySelector(".number" + (isRules ? ".scripts" : ":not(.scripts)"));

	// update numbers
	if (number) {
		--number.textContent;

		if (number.textContent === "0") {
			number.remove();
		}
	}

	// remove elements
	li.remove();

	// if no more li nodes exist the ul can be removed
	if (!ul.querySelector("li")) {
		ul.remove();

		// if no more ul nodes exist we can remove the clicking event
		if (!liP.querySelector("ul")) {
			liP.removeAttribute("class");
			const divP = liP.firstChild;
			divP.removeAttribute("class");
			divP.removeEventListener("click", toggleSubLevel);
		}
	}

	// save preferences and alert the background page
	saveAndAlertBackground();
}

/**
 * @brief Change the rule
 *
 * Changes the rule for the specified level on the dropdown
 *
 * @param e [Event] Event interface on the clicked rule
 */
function changeRule(e) {
	const rule = parseInt(e.target.value, 10);
	const dropdown = e.target.parentNode;

	// rule levels
	const site = [
		dropdown.dataset.domain,
		dropdown.dataset.subdomain,
		dropdown.dataset.page
	];

	// script levels
	const script = [
		dropdown.dataset.scriptdomain,
		dropdown.dataset.scriptsubdomain
	];

	let level = preferences;
	let i = 0;

	// walk through the levels
	while (site[i] !== undefined) {
		level = level.urls[site[i++]];
	}

	// if it's a script rule (rules object)
	if (script[0]) {
		level = level.rules.urls[script[0]];

		// if script rule has a sublevel
		if (script[1] !== undefined) {
			level = level.urls[script[1]];
		}
	}

	// save rule key
	if (rule < 0) {
		// -1 is for null
		level.rule = null;
	}
	else if (!script[0]) {
		// if it has no script url it's saving a policy
		level.rule = rule;
	}
	else {
		// otherwise it's a blocking rule
		level.rule = Boolean(rule);
	}

	// change icon to reflect new rule
	const active = document.getElementById("active");
	active.src = "images/" + e.target.id + "38.png";
	active.alt = jaegerhut[rule].text[0];
	active.title = jaegerhut[rule].text;
	active.dataset.rule = rule;
	active.removeAttribute("id");

	saveAndAlertBackground();
}

/**
 * @brief Change toplevel policy
 *
 * Changes the global policy or global private policy
 *
 * @param e [Event] Event interface on input change
 */
function changePolicy(e) {
	preferences[e.target.name] = parseInt(e.target.value, 10);
	saveAndAlertBackground();
}

/* ====================================================================== */

// base elements to be reused
const numberNode  = document.createElement("span");
const sNumberNode = document.createElement("span");
const ruleNode    = document.createElement("img");
const delNode     = document.createElement("button");

numberNode.className  = "number scripts";
sNumberNode.className = "number";
ruleNode.className    = "rule";
delNode.className     = "delete";

numberNode.title  = chrome.i18n.getMessage("settingsNumScripts");
sNumberNode.title = chrome.i18n.getMessage("settingsNumLevels");
delNode.title     = chrome.i18n.getMessage("settingsDelete");

ruleNode.tabIndex = 0;

const htmldata = [
	"domain",
	"subdomain",
	"page",
	"scriptdomain",
	"scriptsubdomain"
];

/**
 * @brief Fill the list with the rules
 *
 * Creates and injects the DOM elements to represent the rules
 *
 * @param rules [Array]   Rules objects to be printed
 * @param node  [Element] Node where to inject the generated DOM
 * @param urls  [Array]   Parts of the URL:
 * (domain, subdomain, page, script domain, script subdomain)
 *
 * @note Sorting must be done beforehand
 */
function fillList(rules, node, urls) {
	rules.forEach((item) => {
		// main container node to add item info
		const li  = document.createElement("li");
		const div = document.createElement("div");
		li.appendChild(div);

		// name to be printed
		let siteName = "";
		urls.push(item[0]);
		urls.forEach((url, index) => {
			if (url === null) {
				return;
			}

			// data to be used by actions/events
			li.dataset[htmldata[index]] = url;

			// build name to be printed
			switch (index) {
				case 1: // fallthrough
				case 4:
					siteName = (url === "" ? "*://" : url + ".") + siteName;
					break;
				case 3:
					siteName = url;
					break;
				default:
					siteName += url;
			}
		});

		// add info about rule applied to level (Jaegerhut)
		const ruleImg = ruleNode.cloneNode(false);
		ruleImg.src = "images/" + jaegerhut[item[1].rule].name + "38.png";
		ruleImg.alt = jaegerhut[item[1].rule].text[0];
		ruleImg.title = jaegerhut[item[1].rule].text;
		ruleImg.dataset.rule = item[1].rule;
		ruleImg.addEventListener("click", openRuleSelector);
		div.appendChild(ruleImg);

		// add url to main node
		const siteUrl = document.createElement("span");
		siteUrl.className = "site";
		siteUrl.innerHTML = "<span>" + siteName + "</span>";
		div.appendChild(siteUrl);

		// add info about allowed and blocked scripts
		if (item[1].rules) {
			const subrules = Object.entries(item[1].rules.urls).sort();

			if (subrules.length > 0) {
				// indexes 1 and 2 are for subdomain and page sublevels
				// while script rule domain and subdomains are at 3 and 4
				// this adds nulls in indexes 1 and 2 if necessary to skip
				// them and the correct data is written
				while (urls[2] === undefined) {
					urls.push(null);
				}

				// add icon with the number of script rules
				const scriptRules = numberNode.cloneNode(false);
				scriptRules.innerText = subrules.length;
				div.appendChild(scriptRules);

				// node to hold the list
				const ul = document.createElement("ul");
				ul.className = "scripts";
				// sort the list and call this same function to fill the list
				fillList(subrules, ul, urls);

				// add the sub-list into the main container
				li.appendChild(ul);
				div.className = "pointer";
				div.addEventListener("click", toggleSubLevel);

				// remove the null urls added before
				while (urls[2] === null || urls[1] === null) {
					urls.pop();
				}
			}
		}

		// add sub-level rules
		const sublevel = Object.entries(item[1].urls).sort();

		if (sublevel.length > 0) {
			// add icon with the number of sub-domains that exist
			const subRules = sNumberNode.cloneNode(false);
			subRules.innerText = sublevel.length;
			div.appendChild(subRules);

			// node to hold the list
			const ul = document.createElement("ul");
			ul.className = "subrules";
			// sort the list and call this same function to fill the list
			fillList(sublevel, ul, urls);

			// add the sub-list into the main container
			li.appendChild(ul);
			div.className = "pointer";
			div.addEventListener("click", toggleSubLevel);
		}

		// button to delete the rule
		const deleteBtn = delNode.cloneNode(false);
		deleteBtn.addEventListener("click", deleteRule);
		div.appendChild(deleteBtn);

		// add to page
		node.appendChild(li);

		urls.pop();
	});
}

/**
 * @brief Display loaded preferences on screen
 *
 * Gets the current loaded settings and show them on the screen
 */
function showPreferences() {
	// fill policy preferences
	document.querySelector("input[name='rule'][value='" + preferences.rule + "']").checked = true;
	document.querySelector("input[name='private'][value='" + preferences.private + "']").checked = true;

	// fill global blackwhitelist
	fillList(Object.entries(preferences.rules.urls).sort(), document.getElementById("bwl"), [null, null, null]);

	// fill site specific settings
	fillList(Object.entries(preferences.urls).sort(), document.getElementById("rules"), []);
}

/**
 * @brief Load preferences
 *
 * Loads saved preferences from storage API
 *
 * @note Runs immediately on page load
 */
chrome.storage.local.get((pref) => {
	preferences = pref.preferences;
	showPreferences();
});

/**
 * @brief Hide/close the rule selector
 *
 * Hides the rule selector when you click anywhere on the page
 */
document.addEventListener("click", () => {
	document.getElementById("dropdown").className = "";
}, true);

/**
 * @brief Validates a preferences object
 *
 * Validation can be done at multiple levels as long as the level
 * contains a 'rule' key. Validation is recursive and checks the
 * entire object.
 *
 * @note Unknown keys are ignored
 *
 * @param level   [Object]  The level in the object to validate
 * @param isRules [Boolean] If the level is a blacklist
 * @param at      [String]  String identifying the level
 */
function validate(level, isRules, at) {
	at = chrome.i18n.getMessage("settingsInvalidUnder", at);

	if (level.rule !== null) {
		if (isRules) {
			if (typeof level.rule !== "boolean") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidBooleanNull", "rule") + "<span>" + at + "</span>");
			}
		}
		else {
			if (typeof level.rule !== "number") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidNumberNull", "rule") + "<span>" + at + "</span>");
			}

			if (level.rule < 0 || level.rule > 3) {
				throw new RangeError(chrome.i18n.getMessage("settingsInvalidRangeNull", "rule") + "<span>" + at + "</span>");
			}
		}
	}

	if (isRules) {
		if (level.rules !== undefined) {
			throw new SyntaxError(chrome.i18n.getMessage("settingsInvalidLevel", "rules") + "<span>" + at + "</span>");
		}
	}
	else {
		if (typeof level.rules !== "object") {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "rules") + "<span>" + at + "</span>");
		}

		if (typeof level.rules.urls !== "object") {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "urls") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "rules") + "<br>" + at + "</span>");
		}

		Object.entries(level.rules.urls).forEach((object) => {
			validate(object[1], true, object[0] + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "urls") + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "rules") + "<br>" + at);
		});
	}

	if (typeof level.urls !== "object") {
		throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "urls") + "<span>" + at + "</span>");
	}

	Object.entries(level.urls).forEach((object) => {
		validate(object[1], isRules, object[0] + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "urls") + "<br>" + at);
	});
}

/**
 * @brief Translate and attach events
 *
 * This will translate the page and attach the events to the nodes.
 */
document.addEventListener("DOMContentLoaded", () => {
	// translate
	document.title = chrome.i18n.getMessage("settingsTitle");

	const template = document.body.innerHTML;

	document.body.innerHTML = template.replace(/__MSG_(\w+)__/g, (a, b) => {
		return chrome.i18n.getMessage(b);
	});

	// add event listeners into the first two preferences
	document.querySelectorAll("input").forEach((input) => {
		if (input.id) {
			input.addEventListener("change", changeRule);
		}
		else {
			input.addEventListener("change", changePolicy);
		}
	});

	/*
	 * Events for preferences management buttons
	 */
	document.querySelectorAll("button").forEach((button) => {
		switch (button.name) {
			case "r":
				button.addEventListener("click", () => {
					const script = document.createElement("script");
					script.src = "default-prefs.js";
					script.type = "text/javascript";
					script.id = "default";
					document.head.appendChild(script);
				});
				break;
			case "e":
				button.addEventListener("click", () => {
					document.getElementById("text").value = JSON.stringify(preferences, null, "  ");
				});
				break;
			case "i":
				button.addEventListener("click", () => {
					try {
						const prefs = JSON.parse(document.getElementById("text").value);

						// extra checks not made by generic validation
						if (typeof prefs.private !== "number") {
							throw new TypeError(chrome.i18n.getMessage("settingsInvalidNumber", "private") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "root") + "</span>");
						}

						if (prefs.private < 0 || prefs.private > 3) {
							throw new RangeError(chrome.i18n.getMessage("settingsInvalidRange", "private") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "root") + "</span>");
						}

						if (typeof prefs.rule !== "number") {
							throw new TypeError(chrome.i18n.getMessage("settingsInvalidNumber", "rule") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "root") + "</span>");
						}

						if (prefs.rule === null) {
							throw new TypeError(chrome.i18n.getMessage("settingsInvalidRange", "rule") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "root") + "</span>");
						}

						// validate preferences
						validate(prefs, false, "root");
						// will only be reached if no errors occured
						preferences = prefs;
					}
					catch (error) {
						showAlert(chrome.i18n.getMessage("settingsInvalidPrefs"), error.message);
						return;
					}

					// clear the tables to allow the new rules to fill
					document.getElementById("bwl").innerText = "";
					document.getElementById("rules").innerText = "";

					saveAndAlertBackground();
					showPreferences();
				});
				break;
			default:
				button.addEventListener("click", () => {
					document.getElementById("alertbox").className = "";
				});
				break;
		}
	});
});

/**
 * @brief Called when default preferences are loaded
 *
 * Updates the interface to display the new preferences and saves
 * them.
 *
 * @see default-prefs.js
 */
function defaultPreferencesLoaded() {
	// clear the tables to allow the new rules to fill
	document.getElementById("bwl").innerText = "";
	document.getElementById("rules").innerText = "";

	showPreferences();
	saveAndAlertBackground();

	// remove the injected script
	document.getElementById("default").remove();
}
