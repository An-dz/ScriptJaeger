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
 * Badge icons, one for each policy
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
	undefined: {
		offset: 0,
		name: "undefined",
		text: chrome.i18n.getMessage("settingsRulesNone")
	}
};

/*
 * Sorts the array in alphabetical order
 */
function sortUrls(a, b) {
	// console.log("======== Sort ========\n", a, " <-> ", b);
	if (a.name > b.name) {
		return 1;
	}

	if (a.name < b.name) {
		return -1;
	}

	return 0;
}

/*
 * Save the new setting and then send them to the background script
 * so it's aware of changes and can replace them right away
 *
 * As the storage API is async the saving might not be in the same
 * order as the functions are called, it also reduces the calls to
 * the background page
 */
const stateMachine = {
	"b": false,
	"p": false
};

function saveAndAlertBackground(save) {
	clearTimeout(window.saveDelay);

	// enable if received true, keep true if received false
	stateMachine.b = save.b || stateMachine.b;
	stateMachine.p = save.p || stateMachine.p;

	window.saveDelay = setTimeout(function () {
		// console.log("Prefences change requested for policy:", stateMachine.p, ", blackwhitelist:", stateMachine.b);
		const newPrefs = {};

		if (stateMachine.b) {
			newPrefs.blackwhitelist = blackwhitelist;
		}

		if (stateMachine.p) {
			newPrefs.policy = policy;
		}

		// send message to background
		chrome.runtime.sendMessage({
			type: 3, // alert of preferences changes
			newPrefs: newPrefs
		});

		// save preferences
		chrome.storage.local.set(newPrefs
			// , function () { console.log("Preferences Saved!"); }
		);

		stateMachine.b = false; // blackwhitelist was processed
		stateMachine.p = false; // policy was processed
	}, 1000);
}

/* ====================================================================== */

/*
 * Event listeners
 */
function changePolicy(e) {
	const dropdown = document.getElementById("dropdown");
	const levels = e.target.parentNode.dataset.index;
	const rule = jaegerhut[e.target.dataset.rule];
	const pos = e.target.parentNode.getBoundingClientRect();

	pos.y = pos.y + window.scrollY - (rule.offset * document.querySelector("li").offsetHeight);

	// console.log("Moving dropdown to position! X:", e.target.offsetLeft, "Y:", pos.y);

	dropdown.style = "top:" + pos.y + "px;left:" + e.target.offsetLeft + "px";
	// info for updating rule
	dropdown.dataset.index = levels;
	// highlight selected
	dropdown.querySelectorAll("input").forEach(function (n) {
		n.removeAttribute("checked");
	});
	document.getElementById(rule.name).setAttribute("checked", true);

	// hide options that are not possible
	if (levels[0] === "b" || levels.match(/r/)) {
		dropdown.className = "bwl";
	}
	else {
		dropdown.className = "policy";
	}

	e.target.id = "active";
}

function deleteObject(levels, tree) {
	let toDelete = tree;
	const index = levels.pop();

	// iterate until last array level
	levels.forEach(function (lvl) {
		toDelete = toDelete[lvl];
	});

	// console.log("Index:", levels, "Index to delete:", index, "\nRule marked for deletion:", toDelete[index]);

	// delete rule
	// toDelete is a pointer to the global object
	try {
		toDelete.splice(index, 1);

		if (toDelete.length === 0) {
			return deleteObject(levels, tree);
		}

		return toDelete;
	} catch(e) {
		delete toDelete[index];

		if (index === "domains") {
			return deleteObject(levels, tree);
		}

		return false;
	}
}

function deleteRule(e) {
	let div = e.target.parentNode;

	const levels = div.dataset.index.split(",");
	let tree = blackwhitelist.domains;
	let save = { b: true, p: false };

	if (levels.splice(0, 1)[0] === "p") {
		tree = policy.domains;
		save = { b: false, p: true };
	}

	const scripts = (levels[levels.length - 3] === "rules");
	tree = deleteObject(levels, tree);

	// remove list item from DOM
	let li = div.parentNode;
	const ul = li.parentNode;
	ul.innerHTML = "";
	li = ul.parentNode;

	const number = li.querySelector(".number" + (scripts ? ".scripts" : ":not(.scripts)"));
	if (number !== null) {
		--number.textContent;
	}

	if (tree) {
		fillList(tree, ul, ["",""], ul.dataset.index);
	}
	else {
		div = li.firstElementChild;
		div.removeAttribute("class");
		div.removeChild(number);
		li.removeChild(ul);
		li.removeAttribute("class");
	}

	// save preferences and alert the background page
	saveAndAlertBackground(save);
}

function showSubLevel(e) {
	const li = e.target.parentNode;

	if (!e.target.dataset.index) {
		return;
	}

	// console.log("Toggle sub-rules called", li.hasAttribute("class"));

	if (!li.hasAttribute("class")) {
		li.className = "show";
	}
	else {
		li.removeAttribute("class");
		li.querySelectorAll("li.show").forEach(function (node) {
			node.removeAttribute("class");
		});
	}
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

/*
 * Fill the lists with the rules
 * Sorting must be done beforehand
 */
function fillList(array, parentNode, url, idx) {
	// console.log("@fillList array\n", array);
	parentNode.dataset.index = idx;

	array.forEach(function (item, index) {
		// main container node to add item info
		const li  = document.createElement("li");
		const div = document.createElement("div");
		div.dataset.index = idx + index;
		li.appendChild(div);

		// add info about rule applied to level
		const ruleImg = ruleNode.cloneNode(false);
		ruleImg.src = "images/" + jaegerhut[item.rule].name + "38.png";
		ruleImg.alt = jaegerhut[item.rule].text[0];
		ruleImg.title = jaegerhut[item.rule].text;
		ruleImg.dataset.rule = item.rule;
		ruleImg.addEventListener("click", changePolicy);
		div.appendChild(ruleImg);

		// add url to main node
		const siteName = url[0] + (item.name === "" ? "://" + url[1].slice(1) : item.name + url[1]);
		const siteUrl = document.createElement("span");
		siteUrl.className = "site";
		siteUrl.innerHTML = "<span>" + siteName + "</span>";
		div.appendChild(siteUrl);

		// add info about allowed and blocked scripts
		if (item.rules) {
			// console.log("@fillList script list\n", item.rules);
			// add icon with the number of script rules
			const scriptRules = numberNode.cloneNode(false);
			scriptRules.innerText = item.rules.domains.length;
			div.appendChild(scriptRules);

			// node to hold the list
			const ul = document.createElement("ul");
			ul.className = "scripts";
			// sort the list and call this same function to fill the list
			item.rules.domains = item.rules.domains.sort(sortUrls);
			fillList(item.rules.domains, ul, ["", ""], idx + index + ",rules,domains,");

			// add the sub-list into the main container
			li.appendChild(ul);
			div.className = "pointer";
			div.addEventListener("click", showSubLevel);
		}

		// add sub-level rules
		let subLevel = item.sites || item.pages;
		if (subLevel) {
			// add icon with the number of sub-domains that exist
			const subRules = sNumberNode.cloneNode(false);
			subRules.innerText = subLevel.length;
			div.appendChild(subRules);

			// node to hold the list
			const ul = document.createElement("ul");
			ul.className = "subrules";
			// sort the list and call this same function to fill the list
			subLevel = subLevel.sort(sortUrls);
			fillList(subLevel, ul, [
				(item.pages ? siteName : ""),
				(item.sites ? "." + item.name : "")
			], idx + index + (item.sites ? ",sites," : ",pages,"));

			// add the sub-list into the main container
			li.appendChild(ul);
			div.className = "pointer";
			div.addEventListener("click", showSubLevel);
		}

		// button to delete the rule
		const deleteBtn = delNode.cloneNode(false);
		deleteBtn.addEventListener("click", deleteRule);
		div.appendChild(deleteBtn);

		// add to page
		parentNode.appendChild(li);
	});
}

/*
 * Display loaded preferences on screen
 */
function loadPreferences(pref) {
	// console.log("loadPreferences");
	policy = pref.policy;

	// fill policy preferences
	document.querySelector("input[name='rule'][value='" + policy.rule + "']").checked = true;
	document.querySelector("input[name='private'][value='" + policy.private + "']").checked = true;

	// fill global blackwhitelist
	// sorting the domains/subdomains alphabeticaly
	blackwhitelist.domains = pref.blackwhitelist.domains.sort(sortUrls);
	fillList(blackwhitelist.domains, document.getElementById("bwl"), ["",""], "b,");

	// fill site specific settings
	// sorting the domains/subdomains/pages alphabeticaly
	policy.domains = policy.domains.sort(sortUrls);
	fillList(policy.domains, document.getElementById("rules"), ["",""], "p,");
}

/*
 * Load saved preferences and call for displaying them
 */
chrome.storage.local.get(function (pref) {
	loadPreferences(pref);
});

/*
 * Attach events when the page loads
 */
document.addEventListener("DOMContentLoaded", function () {
	// console.log("DOMContentLoaded");
	// translate
	document.title = chrome.i18n.getMessage("settingsTitle");

	const template = document.body.innerHTML;

	document.body.innerHTML = template.replace(/__MSG_(\w+)__/g, function (a, b) {
		return chrome.i18n.getMessage(b);
	});

	/*
	 * Hide/close the rule selector when you click anywhere
	 */
	document.addEventListener("click", function () {
		document.getElementById("dropdown").className = "";
	}, true);


	// add event listeners into the first two preferences
	document.querySelectorAll("input").forEach(function (input) {
		if (input.id) {
			input.addEventListener("change", function (e) {
				let rule = parseInt(e.target.value, 10);
				let levels = e.target.parentNode.dataset.index;

				if (rule < 0) {
					rule = undefined;
				}

				// blacklist is defined as array b in the index value
				// blackwhitelist objects are inside rules key
				if (rule !== undefined && (levels.charCodeAt(0) === 98 || levels.match(/r/))) {
					// effectively converting int to bool
					rule = !!rule;
				}

				let toChange = blackwhitelist.domains;
				let save = { b: true, p: false };
				levels = levels.split(",");

				if (levels.splice(0, 1)[0] === "p") {
					toChange = policy.domains;
					save = { b: false, p: true };
				}

				// iterate until last array level
				levels.forEach(function (lvl) {
					toChange = toChange[lvl];
				});

				// console.log("Apply", e.target.id, "(" + rule + ") rule in", toChange);

				// toChange is a pointer to the global object
				toChange.rule = rule;

				if (rule === undefined) {
					delete toChange.rule;
				}

				const active = document.getElementById("active");
				active.src = "images/" + e.target.id + "38.png";
				active.alt = jaegerhut[rule].text[0];
				active.title = jaegerhut[rule].text;
				active.dataset.rule = rule;
				active.removeAttribute("id");

				saveAndAlertBackground(save);
			});
		}
		else {
			input.addEventListener("change", function (e) {
				// console.log("Changed", e.target.name, "policy to", e.target.value);
				policy[e.target.name] = parseInt(e.target.value, 10);
				// console.log("New policy object\n", policy);
				saveAndAlertBackground({b: false, p: true});
			});
		}
	});

	/*
	 * Events for preferences management buttons
	 */
	document.querySelectorAll("button").forEach(function (button) {
		switch (button.name) {
			case "r":
				button.addEventListener("click", function () {
					const script = document.createElement("script");
					script.src = "default-prefs.js";
					script.type = "text/javascript";
					script.id = "default";
					document.head.appendChild(script);

					// console.log("Default preferences injected");
				});
				break;
			case "e":
				button.addEventListener("click", function () {
					const p = JSON.stringify(policy, null, "  ");
					const b = JSON.stringify(blackwhitelist, null, "  ");

					document.getElementById("text").value =
					"{\"policy\": " + p +
					",\n\"blackwhitelist\": " + b +
					"}";

					// console.log("Settings exported");
				});
				break;
			case "i":
				button.addEventListener("click", function () {
					const text = JSON.parse(document.getElementById("text").value);

					// console.log("Imported JSON:", text);

					// clear the tables to allow the new rules to fill
					document.getElementById("bwl").innerText = "";
					document.getElementById("rules").innerText = "";

					saveAndAlertBackground({b: true, p: true});
					loadPreferences(text);
				});
				break;
			default: break;
		}
	});
});

/*
 * Called when preferences are replaced
 */
function defaultPreferencesLoaded() {
	// clear the tables to allow the new rules to fill
	document.getElementById("bwl").innerText = "";
	document.getElementById("rules").innerText = "";

	loadPreferences({policy: policy, blackwhitelist: blackwhitelist});
	saveAndAlertBackground({b: true, p: true});

	// remove the injected script
	document.head.removeChild(document.getElementById("default"));
}
