"use strict";

/*
 * To translate the policy number to text
 */
const scopeList = ["global", "domain", "site", "page"];
const jaegerhut = {
	0: {
		name: "allowall",
		text: chrome.i18n.getMessage("policyAllowAll")
	},
	1: {
		name: "relaxed",
		text: chrome.i18n.getMessage("policyRelaxed")
	},
	2: {
		name: "filtered",
		text: chrome.i18n.getMessage("policyFiltered")
	},
	3: {
		name: "blockall",
		text: chrome.i18n.getMessage("policyBlockAll")
	}
};

/*
 * Holds data obtained from the background process
 */
var tabInfo = {};

/*
 * Basic nodes
 */
const nodeHost      = document.createElement("div");
const nodeCheckbox  = document.createElement("input");
const nodeWebsocket = document.createElement("div");
const nodeFrames    = document.createElement("div");
const nodeSubdomain = document.createElement("span");
const nodeDomain    = document.createElement("span");
const nodeNumber    = document.createElement("label");
const nodeJS        = document.createElement("a");

nodeHost.className      = "script blocked";
nodeWebsocket.className = "websocket";
nodeFrames.className    = "frames";
nodeSubdomain.className = "subdomain";
nodeDomain.className    = "domain";
nodeNumber.className    = "number";
nodeJS.className        = "js";

nodeCheckbox.type = "checkbox";

nodeNumber.title = chrome.i18n.getMessage("seeResources");

nodeJS.target = "_blank";

/*
 * Set and save the exception rule for that script
 */
function setScriptRule(e) {
	const node = e.target.tagName;
	// console.log("Node:", node);

	// clicking the label for checking individual scripts should not trigger
	if (node === "LABEL") {
		return;
	}

	let div = e.target.parentNode;
	// the span element is inside another span
	if (div.tagName === "SPAN") {
		div = div.parentNode;
	}

	const input = div.firstElementChild;
	// not clicking over input checkbox should invert its state
	if (node !== "INPUT") {
		input.checked = !input.checked;
	}

	const site = [];
	let info = tabInfo;
	const frameid = Number(div.parentNode.id.substring(1));

	if (frameid > 0) {
		info = tabInfo.frames[frameid];
	}

	switch (input.form.className.charCodeAt(0)) {
		// page
		case 112: site[2] = info.page;
		// site - fallthrough
		case 115: site[1] = info.subdomain;
		// domain - fallthrough
		case 100: site[0] = info.domain;
		// global - fallthrough
		default: break;
	}

	// The background script deals with it because the popup process will die on close
	chrome.runtime.sendMessage({
		type: 1, // save script exception
		private: tabInfo.private,
		site: site, // site where the script is being loaded
		script: [ // script information
			div.querySelector(".domain").textContent,
			div.querySelector(".subdomain").textContent.slice(0, -1)
		],
		// @here: true means checked which means allow
		// @blackwhitelist: true means block
		rule: !input.checked
	});
}

/*
 * Opens an overlay div to choose a new policy for the frame
 */
function openFramePolicy(e) {
	const frameid = e.target.parentNode.dataset.frameid;
	const policy = Number(e.target.dataset.policy);
	const dropdown = document.getElementById("frame-edit");
	const pos = e.target.getBoundingClientRect().y - 30;

	dropdown.dataset.frameid = frameid;
	dropdown.className = "site " + jaegerhut[policy].name;
	dropdown.dataset.hidden = false;
	dropdown.style = "top:" + pos + "px";

	dropdown.elements.scope[1].checked = true;
	dropdown.elements.policy[-(policy - 3)].checked = true;
}

function closeFramePolicy() {
	document.getElementById("frame-edit").dataset.hidden = true;
}

/*
 * Build script list
 */
function buildList(frameid) {
	const elemMainNode = document.getElementById("f" + frameid);
	let frame = tabInfo;

	if (frameid > 0) {
		frame = tabInfo.frames[frameid];
	}

	Object.entries(frame.scripts).forEach(function (domain) {
		// console.log("Domain:", domain);
		Object.entries(domain[1]).forEach(function (subdomain) {
			// console.log("Sub-domain:", subdomain);
			const elemHost      = nodeHost.cloneNode(false);
			const elemCheckbox  = nodeCheckbox.cloneNode(false);
			const elemWebsocket = nodeWebsocket.cloneNode(false);
			const elemFrames    = nodeFrames.cloneNode(false);
			const elemSubdomain = nodeSubdomain.cloneNode(false);
			const elemDomain    = nodeDomain.cloneNode(false);
			const elemNumber    = nodeNumber.cloneNode(false);

			elemHost.appendChild(elemCheckbox);
			elemHost.appendChild(elemWebsocket);
			elemHost.appendChild(elemFrames);
			elemHost.appendChild(elemSubdomain);
			elemHost.appendChild(elemDomain);
			elemHost.appendChild(elemNumber);
			elemMainNode.appendChild(elemHost);

			elemCheckbox.id = subdomain[0] + domain[0] + frameid;
			elemNumber.htmlFor = "list_" + subdomain[0] + domain[0] + frameid;

			elemSubdomain.innerHTML = "<span>" + subdomain[0] + ((subdomain[0].length > 0) ? "." : "") + "</span>";
			elemDomain.innerHTML = "<span>" + domain[0] + "</span>";
			elemNumber.innerText = subdomain[1].length;

			/*console.log("Domain:\n\tclientWidth", elemDomain.clientWidth,
			                   "\n\tscrollWidth", elemDomain.scrollWidth,
			          "\nSubDomain:\n\tclientWidth", elemSubdomain.clientWidth,
			                      "\n\tscrollWidth", elemSubdomain.scrollWidth);*/

			// if the text is larger than the area, we display a tooltip
			if (elemSubdomain.scrollWidth > elemSubdomain.clientWidth || elemDomain.scrollWidth > elemDomain.clientWidth) {
				elemHost.title = elemSubdomain.textContent + domain[0];
			}

			// save script exception
			elemHost.addEventListener("click", setScriptRule, false);

			// input that controls the script list visibility
			const openList = nodeCheckbox.cloneNode(false);
			openList.id = "list_" + subdomain[0] + domain[0] + frameid;
			elemMainNode.appendChild(openList);

			// element that holds the list of elements from that host
			const scriptsList = document.createElement("div");
			scriptsList.className = "jslist";
			elemMainNode.appendChild(scriptsList);

			let frames = 0;
			let websockets = 0;

			// populate scripts list
			// script can be a websocket or frame
			subdomain[1].forEach(function (script) {
				// console.log("Script:", script);

				if (!script.blocked) {
					elemCheckbox.checked = true;
					// remove blocked class
					elemHost.className = "script";
				}

				const url = script.protocol + elemSubdomain.textContent + domain[0] + script.name + script.query;
				const elemJS = nodeJS.cloneNode(false);
				elemJS.innerText = script.name.match(/[^/]*.$/);
				elemJS.title = url;
				elemJS.href = url;

				// websocket
				if (script.protocol === "wss://" || script.protocol === "ws://") {
					elemJS.className = "js haswebsocket";
					elemWebsocket.className = "websocket haswebsocket";
					elemWebsocket.title = "\n" + chrome.i18n.getMessage("tooltipWebsockets", (++websockets).toString());
				}

				// if frameid exists it's a frame
				// otherwise it's a normal script/websocket
				if (script.frameid === undefined) {
					scriptsList.appendChild(elemJS);
				}
				else {
					const policy = jaegerhut[tabInfo.frames[script.frameid].policy];
					const elemFrameDiv = document.createElement("div");
					elemFrameDiv.className = "frame";
					elemFrameDiv.dataset.frameid = script.frameid;

					elemFrames.className = "frames hasframe";
					elemFrames.title = chrome.i18n.getMessage("tooltipFrames", (++frames).toString());

					const elemPolicy = document.createElement("img");
					elemPolicy.src = "/images/" + policy.name + "38.png";
					elemPolicy.className = "frame-policy";
					elemPolicy.title = policy.text;
					elemPolicy.dataset.policy = tabInfo.frames[script.frameid].policy;
					elemPolicy.addEventListener("click", openFramePolicy);

					const elemNumberFrame = nodeNumber.cloneNode(false);
					elemNumberFrame.htmlFor = "frame" + script.frameid;
					elemNumberFrame.innerText = Object.keys(tabInfo.frames[script.frameid].scripts).length;

					elemFrameDiv.appendChild(elemPolicy);
					elemFrameDiv.appendChild(elemJS);
					elemFrameDiv.appendChild(elemNumberFrame);
					scriptsList.appendChild(elemFrameDiv);

					const elemCheckboxFrame = nodeCheckbox.cloneNode(false);
					elemCheckboxFrame.id = "frame" + script.frameid;
					scriptsList.appendChild(elemCheckboxFrame);

					const scriptsListFrame = document.createElement("div");
					scriptsListFrame.className = "scripts jslist " + policy.name;
					scriptsListFrame.id = "f" + script.frameid;
					scriptsList.appendChild(scriptsListFrame);

					buildList(script.frameid);
				}

				elemFrames.title = elemFrames.title + elemWebsocket.title;
			});
		});
	});
}

/*
 * When opening the popup we request the info about the
 * page scripts and create the DOM nodes with this info
 */
chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
	chrome.runtime.sendMessage({
		type: 0, // tab info request
		tabid: tabs[0].id
	}, function (tab) {
		// console.log("Tab info", tab);

		// not an http(s) page
		if (typeof tab === "string") {
			// console.log("Char codes:", tab.charCodeAt(0), tab.charCodeAt(1));
			let msg;
			switch (tab.charCodeAt(1)) {
				case 116: // t from ftp
					msg = "errorFTP";
					// fallthrough
				case 105: // i from file
					msg = "errorFile";
					// fallthrough
				default:
					msg = "errorInternal";
			}

			document.body.innerHTML = "<p>" + chrome.i18n.getMessage(msg) + "</p>";
			return;
		}

		// save tab info in variable
		tabInfo = tab;
		tabInfo.tabid = tabs[0].id;

		// policy button reflects current policy
		const form = document.body.firstElementChild;
		form.className = "domain " + jaegerhut[tab.policy].name;
		form.elements.scope[2].checked = true;
		form.elements.policy[-(tab.policy - 3)].checked = true;

		// Allow once is turned on, change button
		if (tabInfo.allowonce === true) {
			const node = document.getElementById("allowonce");
			node.title = chrome.i18n.getMessage("policyAllowOnceDisable");
			node.className = "allowonce";
			node.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path d='M22.33,12.18V7.24L20.25,9.33a7.75,7.75,0,1,0,2.09,8.1h-1.2a6.64,6.64,0,1,1-1.69-7.29l-2,2.05Z'/><rect x='11.56' y='10.98' width='2.13' height='8.04'/><rect x='15.88' y='10.98' width='2.13' height='8.04'/></svg>";
		}

		buildList(0);
	});
});

/*
 * Send to background process to save new policy for the specific scope
 */
function changePolicy(policy, scope, frameid) {
	const msg = {
		type: 2,
		private: tabInfo.private,
		site: []
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
		default: msg.policy = policy;
	}

	chrome.runtime.sendMessage(msg);
}

/*
 * Enable listeners when the DOM has loaded
 */
function enableListeners() {
	document.getElementById("settings").addEventListener("click", closeFramePolicy, true);

	document.getElementById("cancel").addEventListener("click", closeFramePolicy);

	document.getElementById("preferences").addEventListener("click", function () {
		chrome.runtime.openOptionsPage();
	});

	// allow once
	document.getElementById("allowonce").addEventListener("click", function () {
		chrome.runtime.sendMessage({
			type: 4,
			tabId: tabInfo.tabid,
			allow: !tabInfo.allowonce
		});
	});

	document.querySelectorAll("input").forEach(function (input) {
		if (input.name === "scope") {
			input.addEventListener("change", function (e) {
				const form = e.target.form;
				form.className = scopeList[Number(e.target.value)] + " " + form.className.split(" ")[1];
			});
			return;
		}

		input.addEventListener("change", function (e) {
			const form = e.target.form;
			const scope = Number(form.elements.scope.value);
			const policy = Number(e.target.value);
			const frameid = Number(form.dataset.frameid);

			form.className = scopeList[scope] + " " + jaegerhut[policy].name;
			changePolicy(policy, scope, frameid);

			// change all inputs to checked (allowed) or unchecked (blocked)
			if (policy === 0 || policy === 3) {
				document.querySelectorAll("#f" + frameid + "> .script > input").forEach(function (checkbox) {
					checkbox.checked = !policy;
				});

				return;
			}

			// request list of blocked and allowed scripts from background script
			chrome.runtime.sendMessage({
				type: 5,
				tabid: tabInfo.tabid,
				policy: policy,
				frameid: frameid
			}, function (msg) {
				// console.log(msg.scripts);
				msg.scripts.forEach(function (domain) {
					document.getElementById(domain.name).checked = !domain.blocked;
				});
			});
		});
	});
}

/*
 * Build page
 */
document.addEventListener("DOMContentLoaded", function () {
	const template = document.body.innerHTML;

	document.body.innerHTML = template.replace(/__MSG_(\w+)__/g, function (a, b) {
		return chrome.i18n.getMessage(b);
	});

	if (document.location.search === "?webpanel") {
		document.body.style = "width: 100%";
	}

	enableListeners();
});
