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
var jaegerhut = {
	"0": {
		name: "allowall",
		text: "Allow All"
	},
	"1": {
		name: "relaxed",
		text: "Relaxed"
	},
	"2": {
		name: "filtered",
		text: "Filtered"
	},
	"3": {
		name: "blockall",
		text: "Block All"
	},
	"true": {
		name: "blacklist",
		text: "Blacklisted"
	},
	"false": {
		name: "whitelist",
		text: "Whitelisted"
	},
	"undefined": {
		name: "undefined",
		text: "No Rule"
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
var stateMachine = {
	"b": false,
	"p": false
};

var saveDelay;
function saveAndAlertBackground(savePref) {
	clearTimeout(saveDelay);

	stateMachine[savePref] = true;

	saveDelay = setTimeout(function () {
		// console.log("Prefences change requested for policy:", stateMachine.p, ", blackwhitelist:", stateMachine.b);

		var newPrefs = {};
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

		// blackwhitelist was processed
		stateMachine.b = false;
		// policy was processed
		stateMachine.p = false;
	}, 1000);
}

// base elements to be reused
var numberNode = document.createElement("span");
	numberNode.className = "number scripts";
	numberNode.title = "Script rules in this level";

var sNumberNode = document.createElement("span");
	sNumberNode.className = "number";
	sNumberNode.title = "Sub-level rules";

var ruleNode = document.createElement("img");
	ruleNode.className = "rule";
	ruleNode.alt = "";

var delNode = document.createElement("span");
	delNode.title = "Delete";
	delNode.className = "delete";
	delNode.innerText = "+";

/*
 * Fill the lists with the rules
 * Sorting must be done beforehand
 */
function fillList(array, parentNode, url, idx) {
	// console.log("@fillList array\n", array);

	var mainNode;
	var tempNode;
	var tNumNode;
	var siteName;
	var subLevel;
	array.forEach(function (item, index) {
		// main container node to add item info
		mainNode = document.createElement("li");
		mainNode.appendChild(document.createElement("div"));

		mainNode.firstChild.dataset.index = idx + index;

		// add info about rule applied to level
		tempNode = ruleNode.cloneNode();
		tempNode.src = "images/" + jaegerhut[item.rule].name + "38.png";
		tempNode.title = jaegerhut[item.rule].text;
		tempNode.dataset.rule = item.rule;
		mainNode.firstChild.appendChild(tempNode);

		// add url to main node
		siteName = url[0] + (item.name === "" ? "://" + url[1].slice(1) : item.name + url[1]);
		tempNode = document.createTextNode(siteName);
		mainNode.firstChild.appendChild(tempNode);

		// button to delete the rule
		tempNode = delNode.cloneNode();
		mainNode.firstChild.appendChild(tempNode);

		// place to show number of script rules
		tempNode = numberNode.cloneNode();
		mainNode.firstChild.appendChild(tempNode);

		// place to show number of sub-domains/pages
		tNumNode = sNumberNode.cloneNode();
		mainNode.firstChild.appendChild(tNumNode);

		// click event listener for performing actions
		mainNode.firstChild.addEventListener("click", function (e) {
			var level;
			var delIndex;
			var prefArray;
			var toDelete;
			var target = e.target;
			var chCode = target.className.charCodeAt(0);
			// console.log("Click on list", chCode, target.className, e);
			switch(chCode) {
				// user wants to delete a rule
				case 100:
					level = e.target.parentNode.dataset.index.split(",");
					delIndex = level.splice(level.length - 1, 1)[0];
					prefArray = level.splice(0, 1)[0];

					toDelete = blackwhitelist.domains;
					if (prefArray === "p") {
						toDelete = policy.domains;
					}

					// iterate until last array level
					level.forEach(function (lvl) {
						toDelete = toDelete[lvl];
					});

					// console.log("Index:", level, "Index to delete:", delIndex, "\nRule marked for deletion:", toDelete[delIndex]);

					// delete rule
					toDelete.splice(delIndex, 1);

					// remove list item from DOM
					target = target.parentNode; // div
					target = target.parentNode; // li
					target.parentNode.removeChild(target);

					// save preferences and alert the background page
					saveAndAlertBackground(prefArray);

					break;
				// user is selecting a different rule
				case 114:
					prefArray = document.getElementById("dropdown");
					level = target.parentNode.dataset.index;

					// console.log("Moving dropdown to position! X:", target.offsetLeft, "Y:", target.offsetTop);

					prefArray.style = "top:" + target.offsetTop + "px;left:" + target.offsetLeft + "px";
					// info for updating rule
					prefArray.dataset.index = level;
					// highlight selected
					prefArray.querySelectorAll("input").forEach(function (n) { n.removeAttribute("checked"); });
					prefArray.querySelector("input#" + jaegerhut[target.dataset.rule].name).setAttribute("checked", true);
					// hide options that are not possible
					if (level.charCodeAt(0) === 98 || level.match(/r/)) {
						prefArray.className = "bwl";
					} else {
						prefArray.className = "policy";
					}

					target.id = "active";

					break;
				// user clicked to see sub-rules
				case 110:
					target = target.parentNode;
				default:
					target = target.parentNode;
					// console.log("Toggle sub-rules called", target.hasAttribute("class"));
					if (target.hasAttribute("class") === false) {
						target.className = "show";
					} else {
						target.removeAttribute("class");
						target.querySelectorAll("li.show").forEach(function (node) {
							node.removeAttribute("class");
						});
					}
			}
		});

		// add info about allowed and blocked scripts
		if (item.rules) {
			// console.log("@fillList script list\n", item.rules);
			// add number of script rules
			tempNode.innerText = item.rules.domains.length;

			// node to hold the list
			tempNode = document.createElement("ul");
			// sort the list and call this same function to fill the list
			item.rules.domains = item.rules.domains.sort(sortUrls);
			fillList(item.rules.domains, tempNode, ["", ""], idx + index + ",rules,");

			// add the sub-list into the main container
			mainNode.appendChild(tempNode);
		}

		// add children info
		subLevel = item.sites || item.pages;
		if (subLevel !== undefined) {
			// add the number of sub-domains that exist
			tNumNode.innerText = subLevel.length;
			// node to hold the list
			tempNode = document.createElement("ul");
			// sort the list and call this same function to fill the list
			subLevel = subLevel.sort(sortUrls);
			fillList(subLevel, tempNode, [
				(item.pages ? siteName : ""),
				(item.sites ? "." + item.name : "")
			], idx + index + (item.sites ? ",sites," : ",pages,"));

			// add the sub-list into the main container
			mainNode.appendChild(tempNode);
		}

		// add to page
		parentNode.appendChild(mainNode);
	});
}

/*
 * Display loaded preferences on screen
 */
function loadPreferences(pref) {
	policy = pref.policy;

	// fill policy preferences
	document.querySelector("input[name='rule'][value='" + policy.rule + "']").checked = true;
	document.querySelector("input[name='private'][value='" + policy.private + "']").checked = true;

	// add event listeners into the first two preferences
	document.querySelectorAll("input").forEach(function (input) {
		input.addEventListener("change", function (e) {
			var prefArray = "p";

			if (e.target.name.charCodeAt(0) === 99) {
				var rule = parseInt(e.target.value, 10);
				var level = e.target.parentNode.dataset.index;

				// blacklist is defined as array b in the index value
				// blackwhitelist objects are inside rules key
				if (rule !== undefined && (level.charCodeAt(0) === 98 || level.match(/r/))) {
					rule = !rule;
				}

				level = level.split(",");
				prefArray = level.splice(0, 1)[0];

				var toChange = blackwhitelist.domains;
				if (prefArray === "p") {
					toChange = policy.domains;
				}

				// iterate until last array level
				level.forEach(function (lvl) {
					toChange = toChange[lvl];
				});

				// console.log("Apply", e.target.id, "(" + rule + ") rule in", toChange);

				toChange.rule = rule;
				var active = document.getElementById("active");
				active.src = "images/" + e.target.id + "38.png";
				active.title = jaegerhut[rule].text;
			} else {
				// console.log("Changed", e.target.name, "policy to", e.target.value);

				policy[e.target.name] = parseInt(e.target.value, 10);
				// console.log("New policy object\n", policy);
			}

			// save new preferences
			saveAndAlertBackground(prefArray);
		});
	});

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
chrome.storage.local.get(function (pref) { loadPreferences(pref); });

/*
 * Attach events when the page loads
 */
document.addEventListener("DOMContentLoaded", function () {
	/*
	 * Hide/close the rule selector when you click anywhere
	 */
	document.addEventListener("click", function () {
		var dropdown = document.getElementById("dropdown");
		dropdown.className = "";
	}, true);

	/*
	 * Events for preferences management buttons
	 */
	document.querySelectorAll("button").forEach(function (button) {
		if (button.name === "r") {
			button.addEventListener("click", function () {
				var script = document.createElement("script");
				script.src = "default-prefs.js";
				script.type = "text/javascript";
				script.id = "default";
				document.head.appendChild(script);

				// console.log("Default preferences injected");
			});
		}
		else if (button.name === "e") {
			button.addEventListener("click", function () {
				var pol = JSON.stringify(policy, null, "  ");
				var bwl = JSON.stringify(blackwhitelist, null, "  ");
				document.getElementById("text").value =
				"{\"policy\": " + pol +
				",\n\"blackwhitelist\": " + bwl +
				"}";

				// console.log("Settings exported");
			});
		}
		else if (button.name === "i") {
			button.addEventListener("click", function () {
				var text = document.getElementById("text").value;
				text = JSON.parse(text);

				// console.log("Imported JSON:", text);

				// clear the tables to allow the new rules to fill
				document.getElementById("bwl").innerText = "";
				document.getElementById("rules").innerText = "";

				loadPreferences(text);
				saveAndAlertBackground("p");
				saveAndAlertBackground("b");
			});
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
	saveAndAlertBackground("p");
	saveAndAlertBackground("b");

	// remove the injected script
	document.head.removeChild(document.getElementById("default"));
}
