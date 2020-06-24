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
 * @var mergePreferences [Object] Rules to be merged
 *
 * This is used when merging new preferences so it
 * can keep the stuff without costly operations.
 */
let mergingPref = {};

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

	window.saveDelay = setTimeout(() => {
		// send message to background
		chrome.runtime.sendMessage({
			type: 3, // alert of preferences changes
			prefs: preferences
		});

		// save preferences
		chrome.storage.local.set({preferences: preferences});
	}, 1000);
}

/* ====================================================================== */

/**
 * @brief Display an alert box
 *
 * Shows an alert box in the middle of the page
 *
 * @param okaction  [String]  Action to execute when clicking the OK Button
 * @param title     [String]  Title of the alert box
 * @param msg       [String]  Message of the alert box (can be html)
 * @param text      [String]  Textbox content, send null to hide
 * @param cancelBtn [Boolean] If the cancel button must be shown
 */
function showAlert(okaction, title, msg, text, cancelBtn) {
	const alertbox = document.getElementById("alertbox");
	const textarea = document.getElementById("textarea");

	textarea.hidden = text === null;
	textarea.value = text;

	alertbox.className = "visible";
	alertbox.dataset.okaction = okaction;
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
	const ruleNode = e.target;

	const dropdown = document.getElementById("dropdown");
	const rule     = jaegerhut[ruleNode.dataset.rule];
	const div      = ruleNode.parentNode;
	const li       = div.parentNode;
	const pos      = div.getBoundingClientRect();

	// position is relative to visible portion, need to add scrolled distance
	pos.y = pos.y + window.scrollY -
		// open at the position of the current rule
		(rule.offset * document.querySelector("li").offsetHeight);

	dropdown.style.top = `${pos.y}px`;
	dropdown.style.left = `${ruleNode.offsetLeft}px`;

	// copy domains and scripts url parts to dropdown element
	dropdown.dataset.domains = li.dataset.domains;
	dropdown.dataset.scripts = li.dataset.scripts;

	// highlight selected
	document.getElementById(rule.name).checked = true;

	// hide options that are not possible
	if (li.dataset.scripts === "[]") {
		dropdown.className = "policy";
	}
	else {
		dropdown.className = "bwl";
	}

	ruleNode.id = "active";
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
		return;
	}

	li.removeAttribute("class");
	li.querySelectorAll("li.show").forEach(node => {
		node.removeAttribute("class");
	});
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

	const subUrls = JSON.parse(li.dataset.domains);
	const scriptUrls = JSON.parse(li.dataset.scripts);

	let level = preferences;
	const isRules = scriptUrls.length > 0;

	subUrls.forEach((url, index) => {
		if (!isRules && subUrls.length - 1 === index) {
			delete level.urls[url];
			return;
		}

		level = level.urls[url];
	});

	if (isRules) {
		level = level.rules;
	}

	scriptUrls.forEach((url, index) => {
		if (scriptUrls.length - 1 === index) {
			delete level.urls[url];
			return;
		}

		level = level.urls[url];
	});

	// now that the rule has been deleted time to deal with the DOM
	const subNumber = liP.querySelector(".number:not(.scripts)");
	const scriptNumber = liP.querySelector(".number.scripts");

	const number = isRules ? scriptNumber : subNumber;

	// update numbers
	if (number) {
		--number.textContent;

		if (number.textContent === "0") {
			number.textContent = "";
		}
	}

	// remove elements
	li.remove();

	// if no more children exists remove clicking event
	if (subNumber.textContent === 0 && scriptNumber.textContent === 0) {
		liP.removeAttribute("class");
		const divP = liP.firstElementChild;
		divP.removeAttribute("class");
		divP.removeEventListener("click", toggleSubLevel);
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
	const dropdown = e.target.parentNode;

	const subUrls = JSON.parse(dropdown.dataset.domains);
	const scriptUrls = JSON.parse(dropdown.dataset.scripts);

	let level = preferences;
	const isRules = scriptUrls.length > 0;

	subUrls.forEach(url => {
		level = level.urls[url];
	});

	if (isRules) {
		level = level.rules;
	}

	scriptUrls.forEach(url => {
		level = level.urls[url];
	});

	let rule = parseInt(e.target.value, 10);

	// -1 is for null
	if (rule < 0) {
		rule = null;
	}
	// rules is boolean
	else if (isRules) {
		rule = Boolean(rule);
	}

	// save rule key
	level.rule = rule;

	// change icon to reflect new rule
	const active = document.getElementById("active");
	active.src = `images/${e.target.id}38.png`;
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

const ruleNodes = Object.freeze({
	rule:          document.createElement("img"),
	url:           document.createElement("span"),
	subRules:      document.createElement("span"),
	scriptRules:   document.createElement("span"),
	delete:        document.createElement("button"),
	subRulesUl:    document.createElement("ul"),
	scriptRulesUl: document.createElement("ul"),
});

ruleNodes.rule.className          = "rule";
ruleNodes.url.className           = "site";
ruleNodes.subRules.className      = "number";
ruleNodes.scriptRules.className   = "number scripts";
ruleNodes.delete.className        = "delete";
ruleNodes.subRulesUl.className    = "subrules";
ruleNodes.scriptRulesUl.className = "scripts";

ruleNodes.subRules.title    = chrome.i18n.getMessage("settingsNumLevels");
ruleNodes.scriptRules.title = chrome.i18n.getMessage("settingsNumScripts");
ruleNodes.delete.title      = chrome.i18n.getMessage("settingsDelete");

ruleNodes.rule.tabIndex = 0;

/* ====================================================================== */

/**
 * @brief Build an LI DOM Element for the rule
 *
 * Creates the LI for the preferences list for a single rule.
 *
 * @param url         [String] The URL of the rule
 * @param rule        [Number/Boolean] Rule index for Jaegerhut index
 * @param subRules    [Number] number of sub rules
 * @param scriptRules [Number] number of script rules
 * @param subUrls     [Array]  List of url parts of the rule level
 * @param scriptUrls  [Array]  List of url parts of the script rule
 *
 * @return [Element] An LI DOM Element for the rule
 */
function createRuleLi(url, rule, subRules, scriptRules, subUrls, scriptUrls) {
	const ruleLi  = document.createElement("li");
	const ruleDiv = document.createElement("div");

	ruleLi.dataset.domains = JSON.stringify(subUrls);
	ruleLi.dataset.scripts = JSON.stringify(scriptUrls);

	const nodes = Object.freeze({
		rule:        ruleNodes.rule.cloneNode(false),
		url:         ruleNodes.url.cloneNode(false),
		subRules:    ruleNodes.subRules.cloneNode(false),
		scriptRules: ruleNodes.scriptRules.cloneNode(false),
		delete:      ruleNodes.delete.cloneNode(false),
	});

	// the URL
	nodes.url.textContent = url;

	// Jaegerhut: Rule applied
	nodes.rule.src          = `images/${jaegerhut[rule].name}38.png`;
	nodes.rule.alt          = jaegerhut[rule].text[0];
	nodes.rule.title        = jaegerhut[rule].text;
	nodes.rule.dataset.rule = rule;
	nodes.rule.addEventListener("click", openRuleSelector);

	// add icons with the number of sub and script rules
	if (subRules > 0) {
		nodes.subRules.textContent = subRules;
	}

	if (scriptRules > 0) {
		nodes.scriptRules.textContent = scriptRules;
	}

	// add listener for toggling subrules view
	if (subRules > 0 || scriptRules > 0) {
		ruleDiv.className = "pointer";
		ruleDiv.tabIndex = 0;
		ruleDiv.addEventListener("click", toggleSubLevel);
	}

	// delete button listener
	nodes.delete.addEventListener("click", deleteRule);

	// append nodes
	ruleDiv.appendChild(nodes.rule);
	ruleDiv.appendChild(nodes.url);
	ruleDiv.appendChild(nodes.subRules);
	ruleDiv.appendChild(nodes.scriptRules);
	ruleDiv.appendChild(nodes.delete);

	ruleLi.appendChild(ruleDiv);

	return ruleLi;
}

/**
 * @brief Fill the list with the rules
 *
 * Creates and injects the DOM elements to represent the rules
 *
 * @param rulesList [Array]   Rules objects to be printed
 * @param node      [Element] Node where to inject the generated DOMs
 *
 * @note Sorting must be done beforehand
 */
function fillList(rulesList, node) {
	rulesList.forEach(item => {
		// get url parts, these are useful for knowing the rule we must change
		const subUrls = JSON.parse(node.parentNode.dataset.domains);
		const scriptUrls = JSON.parse(node.parentNode.dataset.scripts);

		// we need to append the new url part in the correct part
		const useScript = scriptUrls.length > 0 || node.className === "scripts";
		const urlParts = useScript ? scriptUrls : subUrls;

		urlParts.push(item[0]);

		// print the url as a whole to make it easier for the user
		const url = `${
			urlParts[1] === undefined ? "" : (
				urlParts[1].length > 0 ? `${urlParts[1]}.` : "*://"
			)
		}${
			urlParts[0] || ""
		}${
			urlParts[2] || ""
		}`;

		const data = item[1];

		// get the sub-levels
		const subRules = Object.entries(data.urls);
		const scriptRules = data.rules ? Object.entries(data.rules.urls) : [];

		// build the DOM Element for the item
		const ruleLi = createRuleLi(
			url,
			data.rule,
			subRules.length,
			scriptRules.length,
			subUrls,
			scriptUrls
		);

		const subRulesUl = ruleNodes.subRulesUl.cloneNode(false);
		const scriptRulesUl = ruleNodes.scriptRulesUl.cloneNode(false);

		// append everything together
		ruleLi.appendChild(subRulesUl);
		ruleLi.appendChild(scriptRulesUl);

		// call recursively
		fillList(subRules.sort(), subRulesUl);
		fillList(scriptRules.sort(), scriptRulesUl);

		node.appendChild(ruleLi);
	});
}

/**
 * @brief Display loaded preferences on screen
 *
 * Gets the current loaded settings and show them on the screen
 */
function showPreferences() {
	// fill policy preferences
	document.querySelector(
		`input[name='rule'][value='${preferences.rule}']`
	).checked = true;

	document.querySelector(
		`input[name='private'][value='${preferences.private}']`
	).checked = true;

	// ping pref
	document.querySelector(
		"input[type='checkbox']"
	).checked = !preferences.ping;

	// fill global blackwhitelist
	fillList(
		Object.entries(preferences.rules.urls).sort(),
		document.getElementById("bwl")
	);

	// fill site specific settings
	fillList(
		Object.entries(preferences.urls).sort(),
		document.getElementById("rules")
	);
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
 * @brief Update merge checkboxes
 *
 * If a lower level is checked, upper levels should be checked too.
 * If an upper level is unchecked all sublevel should too.
 *
 * @param event [Event] raised by the checked listener
 */
function checkboxMerge(event) {
	const checked = event.target.checked;
	const li = event.target.parentNode.parentNode;

	// if enabling a level, all parent levels must be enabled too
	if (checked) {
		const upperLi = li.parentNode.parentNode;

		// check upper level
		if (upperLi.tagName === "LI") {
			upperLi.querySelector("input").checked = true;
		}

		// rules that delete a point must check its children
		// but others should not
		if (!event.target.dataset.deleted) {
			return;
		}
	}

	// if disabling a level, all sublevels must be disabled too
	li.querySelectorAll("ul > li > label > input").forEach(input => {
		input.checked = checked;
	});
}

/**
 * @brief Appends an item to the merge settings UI
 *
 * This appends a single line (LI DOM) for a single rule in the
 * merging settings UI (UL DOM).
 *
 * @param[in] url     [String]  Name of the rule level
 * @param[in] current [String]  Name of the current/old rule
 * @param[in] change  [String]  Name of the merging/new rule
 *
 * @return [Element] constructed li html element
 */
function createMergeItem(url, current, change) {
	const li = document.createElement("li");

	const label = document.createElement("label");
	label.className = "flex";

	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = true;
	// add event that controls selection of parents and children
	checkbox.addEventListener("change", checkboxMerge);

	if (change === "deletes") {
		change = "delete";
		checkbox.dataset.deleted = true;
		checkbox.title = chrome.i18n.getMessage("settingsEnabledCheckbox");
	}
	else if (change === "delete") {
		checkbox.dataset.deleted = true;
		checkbox.disabled = true;
		checkbox.title = chrome.i18n.getMessage("settingsDisabledCheckbox");
	}

	const span = document.createElement("span");
	span.innerText = url;

	const currentImg = document.createElement("img");
	currentImg.className = "rule";
	currentImg.src = `images/${jaegerhut[current].name}38.png`;
	currentImg.alt = jaegerhut[current].text[0];
	currentImg.title = chrome.i18n.getMessage(
		"settingsMergeCurrent", jaegerhut[current].text
	);

	const changeImg = document.createElement("img");
	changeImg.className = "rule";
	changeImg.src = `images/${jaegerhut[change].name}38.png`;
	changeImg.alt = jaegerhut[change].text[0];
	changeImg.title = chrome.i18n.getMessage(
		"settingsMergeNew", jaegerhut[change].text
	);

	label.appendChild(checkbox);
	label.appendChild(span);
	label.appendChild(currentImg);
	label.appendChild(changeImg);
	li.appendChild(label);

	return li;
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
 * @param[in]  from [Array]   List of preferences to be merged
 * @param[in]  to   [Object]  Where the preferences must be merged into
 */
function checkMerge(node, from, to) {
	from.forEach(site => {
		const key   = site[0];
		const value = site[1];

		// move rule to variable to prevent reference
		let rule = value.rule;
		let urls = value.urls ? Object.entries(value.urls) : [];
		let rules = value.rules && value.rules.urls ?
			Object.entries(value.rules.urls) : [];

		const oldValue = {
			rule:  (to[key] && to[key].rule !== undefined) ?
				to[key].rule  : "delete",

			rules: (to[key] && to[key].rules) ?
				to[key].rules : {urls:{}},

			urls:  (to[key] && to[key].urls)  ?
				to[key].urls  : {}
		};

		const toDelete = this || value.delete;

		if (toDelete) {
			rule = `delete${value.delete ? "s" : ""}`;
			urls = Object.entries(oldValue.urls);
			rules = Object.entries(oldValue.rules.urls);
		}
		else if (rule === undefined) {
			rule = oldValue.rule;
		}

		const ulUrls = document.createElement("ul");
		const ulRules = document.createElement("ul");
		ulUrls.className = node.className;
		ulRules.className = "scripts";

		checkMerge.call(toDelete, ulUrls, urls, oldValue.urls);
		checkMerge.call(toDelete, ulRules, rules, oldValue.rules.urls);

		// we only show it on the UI if the new `rule` is different
		// or if the other keys are present
		if (
			rule !== oldValue.rule ||
			ulUrls.childElementCount > 0 ||
			ulRules.childElementCount > 0
		) {
			const li = createMergeItem(key, oldValue.rule, rule);

			if (!this) {
				value.checkbox = li.firstElementChild.firstElementChild;
			}

			if (ulUrls.childElementCount > 0) {
				li.className = "show";
				li.appendChild(ulUrls);
			}

			if (ulRules.childElementCount > 0) {
				li.className = "show";
				li.appendChild(ulRules);
			}

			node.appendChild(li);
		}
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
function buildMergeUI(mergingRules) {
	const ul = document.querySelector("#alertbox ul");
	const ulUrls  = document.createElement("ul");
	const ulRules = document.createElement("ul");
	const liUrls  = document.createElement("li");
	const liRules = document.createElement("li");

	ulUrls.className    = "subrules";
	ulRules.className   = "scripts";
	liUrls.textContent  = chrome.i18n.getMessage("settingsRules");
	liRules.textContent = chrome.i18n.getMessage("settingsScripts");

	// it's already valid so no need to check type or content
	const urls = mergingRules.urls ? Object.entries(mergingRules.urls) : [];
	const rules = mergingRules.rules && mergingRules.rules.urls ?
		Object.entries(mergingRules.rules.urls) : [];

	checkMerge(ulUrls,  urls,  preferences.urls);
	checkMerge(ulRules, rules, preferences.rules.urls);

	ul.appendChild(liUrls);
	ul.appendChild(ulUrls);
	ul.appendChild(liRules);
	ul.appendChild(ulRules);
}

/* ====================================================================== */

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
	Object.entries(from).forEach(site => {
		const key   = site[0];
		const value = site[1];

		if (value.checkbox.checked === false) {
			return;
		}

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
 * @brief Prints all levels the rule is under
 *
 * Builds an HTML with all the levels the problem is under.
 *
 * @param at [Array] Each level is an entry
 *
 * @return [String] HTML string
 */
function validatePrintLevels(at) {
	return at.map(
		level => chrome.i18n.getMessage("settingsInvalidUnder", level)
	).join("<br>");
}

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
 * @param[in] obj     [Object]  The level in the object to validate
 * @param[in] isFull  [Boolean] If validation is full or partial
 * @param[in] isRules [Boolean] If the level is a blacklist
 * @param[in] at      [Array]   Array identifying the levels
 *
 * @param[out] warn   [Array]   Array that will contain warnings
 */
function validate(obj, isFull, isRules, at, warn) {
	// this check is to ensure that first all necessary entries exist
	if (isFull) {
		if (obj.rule === undefined) {
			throw new TypeError(
				`${chrome.i18n.getMessage(
					"settingsInvalidBooleanNull", "rule"
				)}<span>${
					validatePrintLevels(at)
				}</span>`
			);
		}

		if (obj.urls === undefined) {
			throw new TypeError(
				`${chrome.i18n.getMessage(
					"settingsInvalidObject", "urls"
				)}<span>${
					validatePrintLevels(at)
				}</span>`
			);
		}

		if (!isRules && obj.rules === undefined) {
			throw new TypeError(
				`${chrome.i18n.getMessage(
					"settingsInvalidObject", "rules"
				)}<span>${
					validatePrintLevels(at)
				}</span>`
			);
		}
	}

	// validate each entry
	Object.entries(obj).forEach(entry => {
		const key   = entry[0];
		const value = entry[1];

		if (key === "rule") {
			// if rule is null then it's correct
			if (value === null) {
				return;
			}
			//  otherwise more checks are necessary

			// blacklist (rules key) uses boolean
			if (isRules) {
				if (typeof value !== "boolean") {
					throw new TypeError(
						`${chrome.i18n.getMessage(
							"settingsInvalidBooleanNull", "rule"
						)}<span>${
							validatePrintLevels(at)
						}</span>`
					);
				}

				return;
			}

			// policy uses a number
			if (typeof value !== "number") {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidNumberNull", "rule"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			if (value < 0 || value > 3) {
				throw new RangeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidRangeNull", "rule"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			return;
		}

		if (key === "rules") {
			// blacklist (rules key) doesn't contain rules subkeys
			if (isRules) {
				throw new SyntaxError(
					`${chrome.i18n.getMessage(
						"settingsInvalidLevel", "rules"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			// policy objects must contain a rules key/object
			if (typeof value !== "object") {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidObject", "rules"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			const atNew = [...at, "rules"];

			// rules key/object must contain a urls key/object
			if (typeof value.urls !== "object") {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidObject", "urls"
					)}<span>${
						validatePrintLevels(atNew)
					}</span>`
				);
			}

			// rules key should only have urls key
			// this is here because of the full check
			Object.keys(value).forEach(subkey => {
				if (subkey !== "urls") {
					warn.push(
						`${chrome.i18n.getMessage(
							"settingsWarningText", subkey
						)}<span>${
							validatePrintLevels(atNew)
						}</span>`
					);

					delete value[subkey];
				}
			});

			// validate children
			Object.entries(value.urls).forEach(object => {
				validate(
					object[1],
					isFull,
					true,
					[...at, "urls", object[0]],
					warn
				);
			});

			return;
		}

		if (key === "urls") {
			// all policy and blacklist objects must contain a urls object
			if (typeof value !== "object") {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidObject", "urls"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			const children = Object.entries(value);

			// limit to 3 levels of policy rules or 2 of script block rules
			if (
				children.length > 0 && (
					(!isRules && at.length > 7) ||
					(isRules && at.length - at.indexOf("rules") > 5)
				)
			) {
				warn.push(
					`${chrome.i18n.getMessage(
						"settingsWarningText2", key
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);

				value.urls = {};
				return;
			}

			// validate children
			children.forEach(object => {
				validate(
					object[1],
					isFull,
					isRules,
					[...at, "urls", object[0]],
					warn
				);
			});

			return;
		}

		if (key === "delete") {
			if (isFull) {
				throw new SyntaxError(
					`${chrome.i18n.getMessage(
						"settingsInvalidDelete", "delete"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			if (value !== true) {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidValue", ["delete", "true"]
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			return;
		}

		// private key is only used under root
		if (key === "private" && at.length === 1) {
			if (typeof value !== "number") {
				throw new TypeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidNumber", "private"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			if (value < 0 || value > 3) {
				throw new RangeError(
					`${chrome.i18n.getMessage(
						"settingsInvalidRange", "private"
					)}<span>${
						validatePrintLevels(at)
					}</span>`
				);
			}

			return;
		}

		warn.push(
			`${chrome.i18n.getMessage(
				"settingsWarningText", key
			)}<span>${
				validatePrintLevels(at)
			}</span>`
		);

		delete obj[key];
	});
}

/**
 * @brief Merge imported file into current preferences
 *
 * A special preferences object can be merged into the preferences.
 * This special object allows to add, delete, modify and ignore rules.
 *
 * @param[in] importedRules [String] Preferences to be merged
 *
 * @warn Side effect: mergingPref receives the mergingRules object
 */
function askMergePreferences(mergingRules) {
	try {
		mergingRules = JSON.parse(mergingRules);

		if (typeof mergingRules !== "object") {
			throw new SyntaxError(
				chrome.i18n.getMessage("settingsInvalidData")
			);
		}

		const warn = [];
		validate(mergingRules, false, false, ["root"], warn);

		if (warn.length > 0) {
			// show warning to let user know some stuff was removed
			showAlert(
				"askmerge",
				chrome.i18n.getMessage("settingsWarningTitle"),
				warn,
				JSON.stringify(mergingRules, null, "  "),
				false
			);

			return;
		}

		showAlert(
			"merge",
			chrome.i18n.getMessage("settingsMergeTitle"),
			chrome.i18n.getMessage("settingsMergeMsg"),
			null,
			true
		);

		buildMergeUI(mergingRules);
		mergingPref = mergingRules;
	}
	catch (error) {
		showAlert(
			"none",
			chrome.i18n.getMessage("settingsInvalidPrefs"),
			error.message,
			null,
			false
		);
	}
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
		const prefs = JSON.parse(document.getElementById("textarea").value);

		if (typeof prefs !== "object") {
			throw new TypeError(
				chrome.i18n.getMessage("settingsInvalidData")
			);
		}

		// null is not allowed at root
		if (typeof prefs.rule !== "number") {
			throw new TypeError(
				`${chrome.i18n.getMessage(
					"settingsInvalidNumber", "rule"
				)}<span>${chrome.i18n.getMessage(
					"settingsInvalidUnder", "root"
				)}</span>`
			);
		}

		const warn = [];

		// validate preferences
		validate(prefs, true, false, ["root"], warn);
		// will only be reached if no errors occured
		preferences = prefs;

		if (warn.length > 0) {
			showAlert(
				"none",
				chrome.i18n.getMessage("settingsWarningTitle"),
				warn,
				null,
				false
			);
		}
	}
	catch (error) {
		showAlert(
			"none",
			chrome.i18n.getMessage("settingsInvalidPrefs"),
			error.message,
			null,
			false
		);
		return;
	}

	newPreferences();
}

/* ====================================================================== */

/**
 * @brief Close the alert box
 *
 * Closes the alert box clearing all content in the textbox
 */
function closeAlert() {
	const alertbox = document.getElementById("alertbox");
	const textarea = document.getElementById("textarea");

	if (alertbox.dataset.okaction === "merge") {
		history.pushState(null, document.title, "prefs.html");
	}

	textarea.hidden = true;
	textarea.value = null;

	alertbox.className = null;
	alertbox.dataset.okaction = "none";
}

/**
 * @brief Alertbox OK button action
 *
 * Execute the correct action when clicking the OK button in the alert
 */
function okClick() {
	const okaction = document.getElementById("alertbox").dataset.okaction;

	if (okaction === "import") {
		importPreferences();
	}
	else if (okaction === "reset") {
		document.querySelector("#alertbox button:last-child").click();

		const script = document.createElement("script");
		script.src = "default-prefs.js";
		script.type = "text/javascript";
		script.id = "default";
		document.head.appendChild(script);
	}
	else if (okaction === "merge") {
		// it's been already validated
		mergePreferences(mergingPref.urls, preferences.urls);
		mergePreferences(mergingPref.rules.urls, preferences.rules.urls);
		newPreferences();
	}
	else if (okaction === "askmerge") {
		const merge = document.getElementById("textarea").value;
		askMergePreferences(merge);
		return;
	}

	closeAlert();
}

/**
 * @brief Reset preferences
 *
 * Click listener for the reset preferences button
 */
function resetPreferencesButton() {
	showAlert(
		"reset",
		chrome.i18n.getMessage("settingsManageResetTitle"),
		chrome.i18n.getMessage("settingsManageResetText"),
		null,
		true
	);
}

/**
 * @brief Export preferences
 *
 * Click listener for the export preferences button
 */
function exportPreferencesButton() {
	showAlert(
		"none",
		chrome.i18n.getMessage("settingsManageExportTitle"),
		chrome.i18n.getMessage("settingsManageExportText"),
		JSON.stringify(preferences, null, "  "),
		false
	);
}

/**
 * @brief Import preferences
 *
 * Click listener for the import preferences button
 */
function importPreferencesButton() {
	showAlert(
		"import",
		chrome.i18n.getMessage("settingsManageImportTitle"),
		chrome.i18n.getMessage("settingsManageImportText"),
		"",
		true
	);
}

/**
 * @brief Merge preferences
 *
 * Click listener for the merge preferences button
 */
function mergePreferencesButton() {
	showAlert(
		"askmerge",
		chrome.i18n.getMessage("settingsManageMergeTitle"),
		chrome.i18n.getMessage("settingsManageMergeText"),
		"",
		true
	);
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
		askMergePreferences(
			decodeURIComponent(document.location.search.substring(1))
		);
	}
});

/**
 * @brief Translate and attach events
 *
 * This will translate the page and attach the events to the nodes.
 */
document.addEventListener("DOMContentLoaded", () => {
	// translate
	document.title = chrome.i18n.getMessage("settingsTitle");

	const template = document.body.innerHTML;

	document.body.innerHTML = template.replace(
		/__MSG_(\w+)__/g,
		(a, b) => chrome.i18n.getMessage(b)
	);

	// Hides the rule selector when you click anywhere on the page
	document.addEventListener("click", () => {
		const dropdown = document.getElementById("dropdown");
		dropdown.className = "";

		for (const key in dropdown.dataset) {
			delete dropdown.dataset[key];
		}
	}, true);

	// first two preferences
	document.querySelectorAll("input[name='rule']").forEach(input => {
		input.addEventListener("change", changeRule);
	});

	document.querySelectorAll("input[name='private']").forEach(input => {
		input.addEventListener("change", changePolicy);
	});

	// ping preferences
	document.querySelector("input[name='ping']").addEventListener(
		"change", e => {
			preferences.ping = !e.target.checked;
			saveAndAlertBackground();
		}
	);

	// preferences management buttons
	document.getElementById("r").addEventListener(
		"click", resetPreferencesButton
	);
	document.getElementById("e").addEventListener(
		"click", exportPreferencesButton
	);
	document.getElementById("i").addEventListener(
		"click", importPreferencesButton
	);
	document.getElementById("m").addEventListener(
		"click", mergePreferencesButton
	);

	// alert buttons
	const buttons = document.querySelectorAll("#alertbox button");
	buttons[0].addEventListener("click", okClick);
	buttons[1].addEventListener("click", closeAlert);
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
