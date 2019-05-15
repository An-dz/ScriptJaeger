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
	},
	delete: {
		name: "delete",
		text: chrome.i18n.getMessage("settingsDelete")
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
 * @param title     [String]  Title of the alert box
 * @param msg       [String]  Message of the alert box (can be html)
 * @param cancelBtn [Boolean] If the cancel button must be shown
 */
function showAlert(title, msg, cancelBtn) {
	const alertbox = document.getElementById("alertbox");
	alertbox.className = "visible";
	alertbox.querySelector("h3").textContent = title;
	alertbox.querySelector("p").innerHTML = msg;
	alertbox.querySelector("button:last-child").hidden = !cancelBtn;
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
			const divP = liP.firstElementChild;
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
	let rule = parseInt(e.target.value, 10);
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

	// -1 is for null
	if (rule < 0) {
		rule = null;
	}
	// if it has script url it's saving a blocking rule
	else if (script[0]) {
		rule = Boolean(rule);
	}

	// save rule key
	level.rule = rule;

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

/* ====================================================================== */

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
				div.tabIndex = 0;
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
			div.tabIndex = 0;
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
	document.querySelector("input[type='checkbox']").checked = !preferences.ping;

	// fill global blackwhitelist
	fillList(Object.entries(preferences.rules.urls).sort(), document.getElementById("bwl"), [null, null, null]);

	// fill site specific settings
	fillList(Object.entries(preferences.urls).sort(), document.getElementById("rules"), []);
}

/**
 * @brief Save preferences and rebuild UI
 *
 * When lots of changes in the preferences happen, this will
 * save the new preferences and will rebuild the rules lists.
 */
function newPreferences() {
	// clear the tables to allow the new rules to fill
	document.getElementById("bwl").innerText = "";
	document.getElementById("rules").innerText = "";

	showPreferences();
	saveAndAlertBackground();
}

/* ====================================================================== */

/**
 * @brief Validates a preferences object
 *
 * Validation can be done at multiple levels as long as the level
 * contains a 'rule' key. Validation is recursive and checks the
 * entire object.
 *
 * @note Unknown keys are deleted
 *
 * @note Full validation check if the whole object is a valid
 * preferences object, it will raise errors if any object is missing.
 * Partial only checks if the values are correct and ignores if some
 * keys are missing, this check is for validating merging operations.
 *
 * @param[in] this    [Object]  The level in the object to validate
 * @param[in] isFull  [Boolean] If validation is full or partial
 * @param[in] isRules [Boolean] If the level is a blacklist
 * @param[in] at      [String]  String identifying the level
 *
 * @param[out] warn   [Array]   Array that will contain warnings
 */
function validate(isFull, isRules, at, warn) {
	// message containing current location in case of any error
	at = chrome.i18n.getMessage("settingsInvalidUnder", at);

	// this check is to ensure that first all necessary entries exist
	if (isFull) {
		if (this.rule === undefined) {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidBooleanNull", "rule") + "<span>" + at + "</span>");
		}

		if (this.urls === undefined) {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "urls") + "<span>" + at + "</span>");
		}

		if (!isRules && this.rules === undefined) {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "rules") + "<span>" + at + "</span>");
		}
	}

	// validate each entry
	Object.entries(this).forEach((entry) => {
		const key   = entry[0];
		const value = entry[1];

		if (key === "rule") {
			// if rule is null then it's correct, otherwise more checks are necessary
			if (value === null) {
				return;
			}

			// blacklist (rules key) uses boolean
			if (isRules) {
				if (typeof value !== "boolean") {
					throw new TypeError(chrome.i18n.getMessage("settingsInvalidBooleanNull", "rule") + "<span>" + at + "</span>");
				}

				return;
			}

			// policy uses a number
			if (typeof value !== "number") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidNumberNull", "rule") + "<span>" + at + "</span>");
			}

			if (value < 0 || value > 3) {
				throw new RangeError(chrome.i18n.getMessage("settingsInvalidRangeNull", "rule") + "<span>" + at + "</span>");
			}

			return;
		}

		if (key === "rules") {
			if (isRules) {
				// blacklist (rules key) doesn't contain rules subkeys, might be a typo
				throw new SyntaxError(chrome.i18n.getMessage("settingsInvalidLevel", "rules") + "<span>" + at + "</span>");
			}

			// policy objects must contain a rules key/object
			if (typeof value !== "object") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "rules") + "<span>" + at + "</span>");
			}

			// rules key/object must contain a urls key/object
			if (typeof value.urls !== "object") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "urls") + "<span>" + chrome.i18n.getMessage("settingsInvalidUnder", "rules") + "<br>" + at + "</span>");
			}

			// validate the children rules
			Object.entries(value.urls).forEach((object) => {
				validate.call(
					object[1],
					isFull,
					true,
					object[0] + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "urls") + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "rules") + "<br>" + at,
					warn
				);
			});

			return;
		}

		if (key === "urls") {
			// all policy and blacklist objects must contain a urls key/object
			if (typeof value !== "object") {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidObject", "urls") + "<span>" + at + "</span>");
			}

			// validate children
			Object.entries(value).forEach((object) => {
				validate.call(
					object[1],
					isFull,
					isRules,
					object[0] + "<br>" + chrome.i18n.getMessage("settingsInvalidUnder", "urls") + "<br>" + at,
					warn
				);
			});

			return;
		}

		if (key === "delete") {
			if (isFull) {
				throw new SyntaxError(chrome.i18n.getMessage("settingsInvalidDelete", "delete") + "<span>" + at + "</span>");
			}

			if (value !== true) {
				throw new TypeError(chrome.i18n.getMessage("settingsInvalidValue", ["delete", "true"]) + "<span>" + at + "</span>");
			}

			return;
		}

		// private key is only used in root, root doesn't have <br>
		if (key !== "private" || at.indexOf("<br>") > -1) {
			warn.push(chrome.i18n.getMessage("settingsWarningText", key) + "<span>" + at + "</span>");
			delete this[key];
		}
	});
}

/**
 * @brief Merges two preferences file
 *
 * The preferences object that will be merged into the other does
 * not need to have all keys.
 *
 * @param[in]  from [Object] Preferences to be merged
 *
 * @param[out] to   [Object] Where the preferences must be merged into
 */
function mergePreferences(from, to) {
	Object.entries(from).forEach((site) => {
		const key   = site[0];
		const value = site[1];

		if (value.delete === true) {
			if (to[key] !== undefined) {
				delete to[key];
			}

			return;
		}

		if (to[key] === undefined) {
			to[key] = {
				rule: null,
				rules: {urls:{}},
				urls: {}
			};
		}

		if (value.rule !== undefined) {
			to[key].rule = value.rule;
		}

		if (value.rules !== undefined) {
			mergePreferences(value.rules.urls, to[key].rules.urls);
		}

		if (value.urls !== undefined) {
			mergePreferences(value.urls, to[key].urls);
		}
	});
}

/**
 * @brief Appends an item to the merge settings UI
 *
 * This appends a single line (LI DOM) for a single rule in the
 * merging settings UI (UL DOM).
 *
 * @param[in] ul      [Element] DOM Element to append the LI into
 * @param[in] url     [String]  Name of the rule level
 * @param[in] current [String]  Name of the current/old rule
 * @param[in] change  [String]  Name of the merging/new rule
 */
function appendMergeList(ul, url, current, change) {
	const li = document.createElement("li");

	const label = document.createElement("label");
	label.className = "flex";

	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = true;

	if (change === "delete") {
		checkbox.dataset.deleted = true;
		checkbox.disabled = true;
	}

	const span = document.createElement("span");
	span.innerText = url;

	const currentImg = document.createElement("img");
	currentImg.className = "rule";
	currentImg.src = "images/" + jaegerhut[current].name + "38.png";
	currentImg.alt = jaegerhut[current].text[0];
	currentImg.title = jaegerhut[current].text;

	const changeImg = document.createElement("img");
	changeImg.className = "rule";
	changeImg.src = "images/" + jaegerhut[change].name + "38.png";
	changeImg.alt = jaegerhut[change].text[0];
	changeImg.title = jaegerhut[change].text;

	label.appendChild(checkbox);
	label.appendChild(span);
	label.appendChild(currentImg);
	label.appendChild(changeImg);
	li.appendChild(label);
	ul.appendChild(li);

	// add event that controls selection of parents and children
	checkbox.addEventListener("change", (e) => {
		const checked = e.target.checked;
		const parent = e.target.parentNode.parentNode;

		// if enabling a level, all parent levels must be enabled too
		if (checked) {
			let upperLi = parent.parentNode.parentNode;

			while (upperLi.tagName === "LI") {
				upperLi.querySelector("input").checked = true;
				upperLi = upperLi.parentNode.parentNode;
			}

			if (!checkbox.dataset.deleted) {
				return;
			}
		}

		// if disabling a level, all sublevels must be disabled too
		parent.querySelectorAll("li input").forEach((input) => {
			input.checked = checked;
		});
	});
}

/**
 * @brief Builds the UI for merging preferences
 *
 * The preferences object that will be merged into the other does not
 * need to have all keys.
 *
 * @note The `this` argument is sent by the function itself when a
 * branch of the preferences is being deleted so that all subitems
 * are added on the UI as being deleted as well.
 *
 * @param[in]  this [Boolean] If this whole rule is being deleted
 * @param[in]  node [Element] DOM Element to inject element
 * @param[in]  from [Object]  Preferences to be merged
 *
 * @param[out] to   [Object]  Where the preferences must be merged into
 */
function buildMergeUI(node, from, to) {
	Object.entries(from).forEach((site) => {
		const key   = site[0];
		const value = site[1];
		let oldValue = to[key];

		if (this || value.delete === true) {
			if (oldValue !== undefined) {
				appendMergeList(node, key, oldValue.rule, "delete");

				// the main level that will be deleted can be toggled
				// but the sublevels can't
				if (!this) {
					node.lastElementChild.firstElementChild.firstElementChild.disabled = false;
				}

				// show sub-levels so the user knows what will be deleted
				if (oldValue.rules !== undefined) {
					const ul = document.createElement("ul");
					buildMergeUI.call(true, ul, oldValue.rules.urls, oldValue.rules.urls);

					// if no elements were added we don't add to the DOM
					if (ul.childElementCount > 0) {
						ul.className = "scripts";
						node.lastElementChild.className = "show";
						node.lastElementChild.appendChild(ul);
						// ul.querySelectorAll("checkbox").forEach();
					}
				}

				if (oldValue.urls !== undefined) {
					const ul = document.createElement("ul");
					buildMergeUI.call(true, ul, oldValue.urls, oldValue.urls);

					// if no elements were added we don't add to the DOM
					if (ul.childElementCount > 0) {
						ul.className = "subrules";
						node.lastElementChild.className = "show";
						node.lastElementChild.appendChild(ul);
					}
				}
			}

			return;
		}

		if (oldValue === undefined) {
			oldValue = {
				rule: "delete",
				rules: {urls:{}},
				urls: {}
			};
		}

		// we only show it on the UI if the new `rule` is different
		// or if the other keys are present
		if (value.rule !== oldValue.rule || value.rules !== undefined || value.urls !== undefined) {
			if (value.rule === undefined) {
				value.rule = oldValue.rule;
			}

			appendMergeList(node, key, oldValue.rule, value.rule);
		}

		if (value.rules !== undefined) {
			const ul = document.createElement("ul");
			buildMergeUI(ul, value.rules.urls, oldValue.rules.urls);

			// if no elements were added we don't add to the DOM
			if (ul.childElementCount > 0) {
				ul.className = "scripts";
				node.lastElementChild.className = "show";
				node.lastElementChild.appendChild(ul);
			}
		}

		if (value.urls !== undefined) {
			const ul = document.createElement("ul");
			buildMergeUI(ul, value.urls, oldValue.urls);

			// if no elements were added we don't add to the DOM
			if (ul.childElementCount > 0) {
				ul.className = "subrules";
				node.lastElementChild.className = "show";
				node.lastElementChild.appendChild(ul);
			}
		}
	});
}

/**
 * @brief Merge imported file into current preferences
 *
 * A special preferences object can be merged into the preferences.
 * This special object allows to add, delete, modify and ignore rules.
 *
 * @param[in] importedRules [String] Preferences to be merged
 */
function askMergePreferences(importedRules) {
	try {
		importedRules = JSON.parse(importedRules);

		if (typeof importedRules !== "object") {
			throw new SyntaxError(chrome.i18n.getMessage("settingsInvalidData"));
		}

		const warn = [];
		validate.call(importedRules, false, false, "root", warn);

		if (warn.length > 0) {
			showAlert(chrome.i18n.getMessage("settingsWarningTitle"), warn, false);
		}
	}
	catch (error) {
		showAlert(chrome.i18n.getMessage("settingsInvalidPrefs"), error.message, false);
		return;
	}

	const ul = document.createElement("ul");

	// it's already valid so no need to check type or content
	if (importedRules.urls) {
		buildMergeUI(ul, importedRules.urls, preferences.urls);
	}

	if (importedRules.rules) {
		const scripts = document.createElement("ul");
		buildMergeUI(scripts, importedRules.rules.urls, preferences.rules.urls);

		// if no elements were added we don't add to the DOM
		if (scripts.childElementCount < 1) {
			return;
		}

		appendMergeList(ul, chrome.i18n.getMessage("settingsScripts"), "false", "false");

		const li = ul.lastElementChild;
		li.className = "blacklist";
		li.querySelectorAll("img").forEach((img) => {
			img.remove();
		});

		scripts.className = "scripts";
		li.appendChild(scripts);
	}

	// if no elements were added we don't add to the DOM
	if (ul.childElementCount < 1) {
		showAlert(chrome.i18n.getMessage("settingsMergeTitle"), chrome.i18n.getMessage("settingsMergeFailMsg"), false);
		return;
	}

	ul.className = "rule-box";
	document.querySelector("#alertbox > .grid > div").appendChild(ul);

	// for `okEvent`
	// checks what rules to ignore
	const removeKey = (li, level) => {
		const label = li.firstElementChild.children;
		const checked = label[0].checked;
		const key = label[1].textContent;

		if (!checked) {
			delete level.urls[key];
			return;
		}

		level = level.urls[key];

		if (level.delete) {
			return;
		}

		li.querySelectorAll(":scope > ul").forEach((sub) => {
			sub.querySelectorAll(":scope > li").forEach((child) => {
				if (sub.className === "scripts") {
					removeKey(child, level.rules);
				} else if (sub.className === "subrules") {
					removeKey(child, level);
				}
			});
		});
	};

	// execute preferences merging if pressing OK
	const okEvent = () => {

		ul.querySelectorAll(":scope > li:not(.blacklist)").forEach((li) => {
			removeKey(li, importedRules);
		});
		ul.querySelectorAll(":scope > li.blacklist > ul > li").forEach((li) => {
			removeKey(li, importedRules.rules);
		});

		// don't need to validate again, it's already guaranteed
		mergePreferences(importedRules.urls, preferences.urls);
		mergePreferences(importedRules.rules.urls, preferences.rules.urls);

		document.querySelector("#alertbox button:last-child").click();
	};

	// remove query from URL if Cancel button is pressed
	const cancelEvent = () => {
		ul.remove();
		history.replaceState(null, document.title, "prefs.html");
		document.querySelector("#alertbox button").removeEventListener("click", okEvent);
		document.querySelector("#alertbox button:last-child").removeEventListener("click", cancelEvent);
	};

	document.querySelector("#alertbox button").addEventListener("click", okEvent);
	document.querySelector("#alertbox button:last-child").addEventListener("click", cancelEvent);

	showAlert(chrome.i18n.getMessage("settingsMergeTitle"), chrome.i18n.getMessage("settingsMergeMsg"), true);
}

/**
 * @brief Replace current preferences with a new one
 *
 * Will try to replace the current preferences with a new one
 * provided in the textarea of the import dialogue. The new file
 * is validated before importing is allowed and will raise error
 * or warning dialogues.
 */
function importPreferences() {
	try {
		const prefs = JSON.parse(document.getElementById("text").value);

		if (typeof prefs !== "object") {
			throw new TypeError(chrome.i18n.getMessage("settingsInvalidData"));
		}

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

		const warn = [];

		// validate preferences
		validate.call(prefs, true, false, "root", warn);
		// will only be reached if no errors occured
		preferences = prefs;

		if (warn.length > 0) {
			showAlert(chrome.i18n.getMessage("settingsWarningTitle"), warn, false);
		}
	}
	catch (error) {
		showAlert(chrome.i18n.getMessage("settingsInvalidPrefs"), error.message, false);
		return;
	}

	newPreferences();
}

/* ====================================================================== */

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

	// now we can try merging preferences
	if (document.location.search.length > 0) {
		askMergePreferences(decodeURIComponent(document.location.search.substring(1)));
	}
});

/**
 * @brief Hide/close the rule selector
 *
 * Hides the rule selector when you click anywhere on the page
 */
document.addEventListener("click", () => {
	const dropdown = document.getElementById("dropdown");
	dropdown.className = "";

	for (const key in dropdown.dataset) {
		delete dropdown.dataset[key];
	}
}, true);

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
	document.querySelectorAll("input[type='radio']").forEach((input) => {
		if (input.id) {
			input.addEventListener("change", changeRule);
		}
		else {
			input.addEventListener("change", changePolicy);
		}
	});

	document.querySelector("input[type='checkbox']").addEventListener("change", (e) => {
		preferences.ping = !e.target.checked;
		saveAndAlertBackground();
	});

	/*
	 * Events for preferences management buttons
	 */
	document.querySelectorAll("button").forEach((button) => {
		switch (button.name) {
			case "r":
				button.addEventListener("click", () => {
					const handle = () => {
						document.querySelector("#alertbox button:last-child").click();

						const script = document.createElement("script");
						script.src = "default-prefs.js";
						script.type = "text/javascript";
						script.id = "default";
						document.head.appendChild(script);
					};

					const removeHandles = () => {
						document.querySelector("#alertbox button").removeEventListener("click", handle);
						document.querySelector("#alertbox button:last-child").removeEventListener("click", removeHandles);
					};

					document.querySelector("#alertbox button").addEventListener("click", handle);
					document.querySelector("#alertbox button:last-child").addEventListener("click", removeHandles);

					showAlert(chrome.i18n.getMessage("settingsManageResetTitle"), chrome.i18n.getMessage("settingsManageResetText"), true);
				});
				break;
			case "e":
				button.addEventListener("click", () => {
					const text = document.getElementById("text");
					text.value = JSON.stringify(preferences, null, "  ");
					text.hidden = false;

					showAlert(chrome.i18n.getMessage("settingsManageExportTitle"), chrome.i18n.getMessage("settingsManageExportText"), false);
				});
				break;
			case "i":
				button.addEventListener("click", () => {
					const handle = () => {
						importPreferences();
						document.querySelector("#alertbox button:last-child").click();
					};

					const removeHandles = () => {
						document.querySelector("#alertbox button").removeEventListener("click", handle);
						document.querySelector("#alertbox button:last-child").removeEventListener("click", removeHandles);
					};

					document.getElementById("text").hidden = false;

					document.querySelector("#alertbox button").addEventListener("click", handle);
					document.querySelector("#alertbox button:last-child").addEventListener("click", removeHandles);

					showAlert(chrome.i18n.getMessage("settingsManageImportTitle"), chrome.i18n.getMessage("settingsManageImportText"), true);
				});
				break;
			default:
				button.addEventListener("click", () => {
					const text = document.getElementById("text");
					text.hidden = true;
					text.value = "";
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
	newPreferences();
	// remove the injected script
	document.getElementById("default").remove();
}
