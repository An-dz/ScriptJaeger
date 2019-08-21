"use strict";

/**
 * @var jaegerhut [Object] Badge icons, one for each policy
 */
const jaegerhut = {
	0: {
		name: "allowall",
		colour: "#D84A4A",
		text: chrome.i18n.getMessage("policyAllowAll")
	},
	1: {
		name: "relaxed",
		colour: "#559FE6",
		text: chrome.i18n.getMessage("policyRelaxed")
	},
	2: {
		name: "filtered",
		colour: "#73AB55",
		text: chrome.i18n.getMessage("policyFiltered")
	},
	3: {
		name: "blockall",
		colour: "#26272A",
		text: chrome.i18n.getMessage("policyBlockAll")
	},
	undefined: {
		name: "undefined",
		colour: "#6F7072"
	}
};

/**
 * @var tabInfo [Object] Holds data about the tab
 * obtained from the background process
 */
let tabInfo = {};

/**
 * @var port [Object] A connection Port that allows message exchanging
 */
let port;

/*
 * Basic nodes for building the interface
 */
const nodeHost      = document.createElement("div");
const nodeCheckbox  = document.createElement("input");
const nodeDetails   = document.createElement("label");
const nodeWebsocket = document.createElement("div");
const nodeFrames    = document.createElement("div");
const nodeSubdomain = document.createElement("span");
const nodeDomain    = document.createElement("span");
const nodeNumber    = document.createElement("label");
const nodeResource  = document.createElement("a");
const nodeHostsList = document.createElement("div");

nodeHost.className      = "host blocked";
nodeDetails.className   = "details";
nodeWebsocket.className = "websocket";
nodeFrames.className    = "frames";
nodeSubdomain.className = "subdomain";
nodeDomain.className    = "domain";
nodeNumber.className    = "number";
nodeResource.className  = "resource";
nodeHostsList.className = "hosts";

nodeHostsList.id = "f0";

nodeCheckbox.type = "checkbox";

nodeNumber.title = chrome.i18n.getMessage("seeResources");

nodeResource.target = "_blank";

/**
 * @brief Set and save an exception rule for that script
 *
 * Fired whenever the user changes the checkbox of a rule.
 * This will set and save the rule according to what the
 * user has chosen.
 *
 * @param e [Event] Event interface on the checkbox change event
 */
function setScriptRule(e) {
	const input = e.target;

	let info = tabInfo;
	const frameID = parseInt(input.dataset.frameid, 10);

	if (frameID > 0) {
		info = tabInfo.frames[frameID];
	}

	const msg = {
		type: 0,
		private: tabInfo.private,
		site: [],
		rule: {}
	};

	switch (parseInt(document.getElementById("settings").dataset.scope, 10)) {
		// page
		case 3: msg.site[2] = info.page;
		// site - fallthrough
		case 2: msg.site[1] = info.subdomain;
		// domain - fallthrough
		case 1: msg.site[0] = info.domain;
		// global - fallthrough
		default:
	}

	const domain = input.dataset.domain;
	const subdomain = input.dataset.subdomain;

	msg.rule[domain] = {
		rule: null,
		urls: {}
	};

	msg.rule[domain].urls[subdomain] = {
		// in the DOM true means checked which means allow
		// in the settings true means block
		rule: !input.checked,
		urls: {}
	};

	// The background script deals with it because the popup process will die on close
	port.postMessage(msg);
}

/**
 * @brief Open dropdown to choose frame policy
 *
 * Opens an overlay div to choose a new policy for a frame.
 * This is fired when clicking on a hat (Jaegerhut)
 *
 * @param e [Event] Event interface on the clicked Jaegerhut
 */
function openFramePolicy(e) {
	const frameid = e.target.parentNode.dataset.frameid;
	const policy = parseInt(e.target.dataset.policy, 10);
	const dropdown = document.getElementById("frame-edit");
	const pos = e.target.getBoundingClientRect().y - 30;

	dropdown.dataset.frameid = frameid;
	dropdown.dataset.hidden = false;
	dropdown.style = `top:${pos}px`;

	dropdown.dataset.scope = 1;
	dropdown.dataset.policy = policy;
}

/**
 * @brief Close frame policy dropdown
 *
 * Closes the overlay div where you choose a new policy for a frame.
 */
function closeFramePolicy() {
	document.getElementById("frame-edit").dataset.hidden = true;
}

/**
 * @brief Build resource list in the DOM
 *
 * Injects nodes to display the list of resources that the page
 * contains. Also attaches events to the elements to allow
 * manipulation of the settings.
 *
 * @param frameid [Number] id of the frame being built
 */
function buildList(frameID) {
	const elemMainNode = document.getElementById(`f${frameID}`);
	let frame = tabInfo;

	if (frameID > 0) {
		frame = tabInfo.frames[frameID];
	}

	Object.entries(frame.scripts).sort().forEach((domainData) => {
		const domain = domainData[0];

		Object.entries(domainData[1]).sort().forEach((subdomainData) => {
			const subdomain = subdomainData[0];
			const resources = subdomainData[1];

			const elemHost      = nodeHost.cloneNode(false);
			const elemCheckbox  = nodeCheckbox.cloneNode(false);
			const elemDetails   = nodeDetails.cloneNode(false);
			const elemWebsocket = nodeWebsocket.cloneNode(false);
			const elemFrames    = nodeFrames.cloneNode(false);
			const elemSubdomain = nodeSubdomain.cloneNode(false);
			const elemDomain    = nodeDomain.cloneNode(false);
			const elemNumber    = nodeNumber.cloneNode(false);

			elemDetails.appendChild(elemWebsocket);
			elemDetails.appendChild(elemFrames);
			elemDetails.appendChild(elemSubdomain);
			elemDetails.appendChild(elemDomain);
			elemHost.appendChild(elemCheckbox);
			elemHost.appendChild(elemDetails);
			elemHost.appendChild(elemNumber);
			elemMainNode.appendChild(elemHost);

			const hostID = `${subdomain}${domain}${frameID}`;

			elemCheckbox.id = hostID;
			elemDetails.htmlFor = hostID;

			elemSubdomain.innerHTML = `<span>${subdomain}${((subdomain.length > 0) ? "." : "")}</span>`;
			elemDomain.innerHTML = `<span>${domain}</span>`;
			elemNumber.innerText = resources.length;

			// if the text is larger than the area, we display a tooltip
			if (elemSubdomain.scrollWidth > elemSubdomain.clientWidth || elemDomain.scrollWidth > elemDomain.clientWidth) {
				elemHost.title = `${elemSubdomain.textContent}${domain}`;
			}

			// save script exception
			elemCheckbox.addEventListener("change", setScriptRule, false);
			// add data to checkbox
			elemCheckbox.dataset.frameid = frameID;
			elemCheckbox.dataset.domain = domain;
			elemCheckbox.dataset.subdomain = subdomain;

			// input that controls the script list visibility
			const openList = nodeCheckbox.cloneNode(false);
			openList.id = `list_${hostID}`;
			elemNumber.htmlFor = `list_${hostID}`;
			elemMainNode.appendChild(openList);

			// element that holds the list of elements from that host
			const resourcesList = document.createElement("div");
			resourcesList.className = "resources";
			elemMainNode.appendChild(resourcesList);

			let frames = 0;
			let websockets = 0;

			// populate scripts list
			// script can be a websocket or frame
			resources.forEach((script) => {
				if (!script.blocked) {
					elemCheckbox.checked = true;
					// remove blocked class
					elemHost.className = "host";
				}

				const url = `${script.protocol}${elemSubdomain.textContent}${domain}${script.name}${script.query}`;
				const elemResource = nodeResource.cloneNode(false);
				elemResource.innerText = script.name.match(/[^/]*.$/);
				elemResource.title = url;
				elemResource.href = url;

				// websocket
				if (script.protocol === "wss://" || script.protocol === "ws://") {
					elemResource.className = "resource haswebsocket";
					elemWebsocket.className = "websocket haswebsocket";
					elemWebsocket.title = `\n${chrome.i18n.getMessage("tooltipWebsockets", (++websockets).toString())}`;
				}

				// if frameid exists it's a frame
				// otherwise it's a normal script/websocket
				if (script.frameid === undefined) {
					resourcesList.appendChild(elemResource);
				}
				else {
					const policy = jaegerhut[tabInfo.frames[script.frameid].policy];
					const elemFrameDiv = document.createElement("div");
					elemFrameDiv.className = "frame";
					elemFrameDiv.dataset.frameid = script.frameid;

					elemFrames.className = "frames hasframe";
					elemFrames.title = chrome.i18n.getMessage("tooltipFrames", (++frames).toString());

					const elemPolicy = document.createElement("img");
					elemPolicy.src = `/images/${policy.name}38.png`;
					elemPolicy.className = "frame-policy";
					elemPolicy.title = policy.text;
					elemPolicy.dataset.policy = tabInfo.frames[script.frameid].policy;
					elemPolicy.addEventListener("click", openFramePolicy);

					const elemNumberFrame = nodeNumber.cloneNode(false);
					elemNumberFrame.htmlFor = `frame${script.frameid}`;
					elemNumberFrame.innerText = Object.keys(tabInfo.frames[script.frameid].scripts).length;

					elemFrameDiv.appendChild(elemPolicy);
					elemFrameDiv.appendChild(elemResource);
					elemFrameDiv.appendChild(elemNumberFrame);
					resourcesList.appendChild(elemFrameDiv);

					const elemCheckboxFrame = nodeCheckbox.cloneNode(false);
					elemCheckboxFrame.id = `frame${script.frameid}`;
					resourcesList.appendChild(elemCheckboxFrame);

					const resourcesListFrame = document.createElement("div");
					resourcesListFrame.className = `resources ${policy.name}`;
					resourcesListFrame.id = `f${script.frameid}`;
					resourcesList.appendChild(resourcesListFrame);

					buildList(script.frameid);
				}

				elemFrames.title = `${elemFrames.title}${elemWebsocket.title}`;
			});
		});
	});
}

/**
 * @brief Sets and build the popup UI
 *
 * Define main classes and then call the script list builder.
 */
function startUI() {
	const error = document.getElementById("error");
	const settings = document.getElementById("settings");

	settings.replaceChild(nodeHostsList.cloneNode(false), document.getElementById("f0"));
	settings.removeAttribute("hidden");
	error.hidden = true;

	const blocked = tabInfo.policy ? tabInfo.allowonce ? "(T) " : `(${tabInfo.blocked}) ` : "";

	document.title = `${blocked}ScriptJäger`;
	document.getElementById("jaegerhut").href = `images/${jaegerhut[tabInfo.policy].name}38.png`;
	document.getElementById("jaegerfarbe").content = jaegerhut[tabInfo.policy].colour;

	let skip = false;

	switch (tabInfo.protocol) {
		case "https://":
		case "http://":
			break;
		case "chrome://":
		case "chrome-extension://":
			skip = "errorInternal";
			break;
		case "file://":
			if (!tabInfo.policy) {
				skip = "errorFile";
			}
			break;
		default:
			skip = "errorInternal";
	}

	document.body.className = jaegerhut[tabInfo.policy].name;

	if (skip !== false) {
		error.innerText = chrome.i18n.getMessage(skip);
		error.removeAttribute("hidden");
		settings.hidden = true;
		return;
	}

	// policy button reflects current policy
	settings.dataset.policy = tabInfo.policy;

	const allowonce = document.getElementById("allowonce");

	// Allow once is turned on
	if (tabInfo.allowonce === true) {
		allowonce.title = chrome.i18n.getMessage("policyAllowOnceDisable");
		allowonce.className = "allowonce";
	}
	// Allow once is turned off
	else {
		allowonce.title = chrome.i18n.getMessage("policyAllowOnce");
		allowonce.className = "";
	}

	buildList(0);
}

/**
 * @brief Get info about tab
 *
 * When opening the popup we request the info about the
 * page scripts and create the DOM nodes with this info
 *
 * @param tabs [Array] Contains info about the current tab
 */
chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
	port = chrome.runtime.connect({name: tabs[0].id.toString(10)});

	/**
	 * @brief Perform actions acording to message
	 *
	 * The background script will send the info we need
	 *
	 * Child 'type' will contain the type of the request
	 *
	 * @param msg [Object] Contains type and data for the action
	 *
	 * @note Each request has different msg children/info
	 *
	 * 0 (Re)Build UI - Whenever the UI has to be completely updated
	 *   - data [Object] Tab info, a children of background tabStorage
	 * 
	 * 1 Update interface
	 *
	 * 2 Response of allowed/blocked list for relaxed/filtered
	 *   - tabid   [Number] id of the requested tab
	 *   - scripts [Array]  Contains the url and the rule
	 *     - name    [String]  DOM ID of the script
	 *     - blocked [Boolean] Whether that level will be blocked
	 */
	port.onMessage.addListener((msg) => {
		console.log(msg);

		if (msg.type === 0) {
			// save tab info in variable
			tabInfo = msg.data;
			startUI();
			return;
		}

		if (msg.type === 1) {
			return;
		}

		// msg.type === 2
		// check if the user has not changed tab
		if (msg.tabid === tabInfo.tabid) {
			msg.scripts.forEach((domain) => {
				document.getElementById(domain.name).checked = !domain.blocked;
			});
		}
	});
});

/**
 * @brief Save new policy
 *
 * Send to background process to save new policy for the specific scope
 *
 * @param policy  [Number] Policy to save
 * @param scope   [Number] Where to change rule, e.g. domain, global
 * @param frameid [Number] Frame where the policy change is being done
 */
function changePolicy(policy, scope, frameid) {
	const msg = {
		type: 0,
		private: tabInfo.private,
		site: [],
		rule: policy
	};

	let frame = tabInfo;

	if (frameid > 0) {
		frame = tabInfo.frames[frameid];
	}

	switch (scope) {
		// page
		case 3: msg.site[2] = frame.page;
		// site - fallthrough
		case 2: msg.site[1] = frame.subdomain;
		// domain - fallthrough
		case 1: msg.site[0] = frame.domain;
		// global - fallthrough
		default:
	}

	port.postMessage(msg);
}

/**
 * @brief Enable listeners when the DOM has loaded
 *
 * When the DOM is loaded we can attach the events to manipulate
 * the preferences.
 */
function enableListeners() {
	document.getElementById("settings").addEventListener("click", closeFramePolicy, true);

	document.getElementById("cancel").addEventListener("click", closeFramePolicy);

	document.getElementById("preferences").addEventListener("click", (e) => {
		e.stopPropagation();
		chrome.runtime.openOptionsPage();
	});

	// allow once
	document.getElementById("allowonce").addEventListener("click", (e) => {
		e.stopPropagation();
		port.postMessage({
			type: 1,
			tabId: tabInfo.tabid,
			allow: !tabInfo.allowonce
		});
	});

	document.querySelectorAll(".scopes").forEach((scopes) => {
		scopes.addEventListener("click", (e) => {
			e.target.parentNode.parentNode.dataset.scope = e.target.dataset.value;
		});
	});

	document.querySelectorAll(".policies").forEach((policies) => {
		policies.addEventListener("click", (e) => {
			const target = (e.target.tagName === "IMG") ? e.target.parentNode : e.target;

			const frame = target.parentNode.parentNode.dataset;
			const policy = parseInt(target.dataset.value, 10);
			const scope = parseInt(frame.scope, 10);

			frame.policy = policy;

			changePolicy(policy, scope, frame.frameid);

			if (frame.frameid > 0) {
				document.getElementById(`f${frame.frameid}`).className = `resources ${jaegerhut[frame.policy].name}`;
			} else {
				document.body.className = jaegerhut[frame.policy].name;
			}

			// change all inputs to checked (allowed) or unchecked (blocked)
			if (policy === 0 || policy === 3) {
				document.querySelectorAll(`#f${frame.frameid} > .script > input`).forEach((checkbox) => {
					checkbox.checked = !policy;
				});

				return;
			}

			// request list of blocked and allowed scripts from background script
			port.postMessage({
				type: 2,
				policy: policy,
				tabid: tabInfo.tabid,
				frameid: frame.frameid,
				window: tabInfo.window,
			});
		});
	});
}

/**
 * @brief Translate and attach events
 *
 * This will translate the page and attach the events to the nodes.
 */
document.addEventListener("DOMContentLoaded", () => {
	const template = document.body.innerHTML;

	// translate the page
	document.body.innerHTML = template.replace(/__MSG_(\w+)__/g, (a, b) => {
		return chrome.i18n.getMessage(b);
	});

	// allow resizable width on webpanel
	if (document.location.search === "?webpanel") {
		document.body.style = "width: 100%";
	}

	enableListeners();
});
