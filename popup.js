/*
 * To translate the policy number to text
 */
var policyList = ["allowall", "relaxed", "filtered", "blockall", "blockall", "blockall"];

/*
 * Holds data obtained from the background process
 */
var tabInfo = {};
var blackwhitelist = {};
var framesAndWebsocket = {};

/*
 * Build script list
 */
function buildList(frmInfo, frameid) {
	Object.keys(frmInfo.scripts).forEach(function (domain) {
		// console.log("Domain:", domain);

		Object.keys(frmInfo.scripts[domain]).forEach( function (subdomain) {
			// console.log("Sub-domain:", subdomain);

			var subdomainArr  = frmInfo.scripts[domain][subdomain];
			var hostNode      = document.createElement("div");
			var websocketNode = document.createElement("div");
			var framesNode    = document.createElement("div");
			var checkmarkNode = document.createElement("input");
			var subdomainNode = document.createElement("span");
			var domainNode    = document.createElement("span");
			var numberNode    = document.createElement("label");

			hostNode.className      = "script blocked";
			websocketNode.className = "websocket";
			framesNode.className    = "frames";
			subdomainNode.className = "subdomain";
			domainNode.className    = "domain";
			numberNode.className    = "number";

			checkmarkNode.type = "checkbox";

			numberNode.htmlFor = subdomain + domain + frameid;

			subdomainNode.innerHTML = "<span>" + subdomain + ((subdomain.length > 0)? "." : "") + "</span>";
			domainNode.innerHTML = "<span>" + domain + "</span>";
			numberNode.innerText = subdomainArr.length;

			numberNode.title = "Click to see the list of scripts, frames or websocket connections";

			hostNode.appendChild(checkmarkNode);
			hostNode.appendChild(websocketNode);
			hostNode.appendChild(framesNode);
			hostNode.appendChild(subdomainNode);
			hostNode.appendChild(domainNode);
			hostNode.appendChild(numberNode);
			document.querySelector("#f" + frameid + ".scripts").appendChild(hostNode);

			// console.log("Domain:\n\tclientWidth", domainNode.clientWidth, "\n\tscrollWidth", domainNode.scrollWidth, "\nSubDomain:\n\tclientWidth", subdomainNode.clientWidth, "\n\tscrollWidth", subdomainNode.scrollWidth);

			// if the text is larger than the area, we display a tooltip
			if (subdomainNode.scrollWidth > subdomainNode.clientWidth || domainNode.scrollWidth > domainNode.clientWidth) {
				hostNode.title = subdomainNode.innerText + domain;
			}

			// save script exception
			hostNode.addEventListener("click", function (e) {
				var target = e.target;
				var char = target.tagName.charCodeAt(0);
				// console.log("Char code:", char);

				// clicking the (L)abel for checking individual scripts should not trigger
				if (char === 76) {
					return;
				}

				target = target.parentNode;
				// the span element is inside another span
				if (target.tagName.charCodeAt(0) === 83) {
					target = target.parentNode;
				}

				var input = target.querySelector("input");
				// not clicking over (I)nput checkmark should invert its state
				if (char !== 73) {
					input.checked = !input.checked;
				}

				var site = [];
				switch (document.body.className.charCodeAt(0)) {
					// page
					case 112: site[2] = frmInfo.page;
					// site
					case 115: site[1] = frmInfo.subdomain;
					// domain
					case 100: site[0] = frmInfo.domain;
					// global
					default: break;
				}

				// The background script deals with it because the popup process will die on close
				chrome.runtime.sendMessage({
					type: 1, // save script exception
					private: tabInfo.private,
					site: site, // site where the script is being loaded
					script: [ // script information
						target.querySelector(".domain").innerText,
						target.querySelector(".subdomain").innerText.slice(0,-1)
					],
					// @here: true means checked which means allow
					// @blackwhitelist: true means block
					rule: !input.checked
				});
			}, false);

			var jsList = document.createElement("input");
			jsList.type = "checkbox";
			jsList.hidden = true;
			jsList.id = subdomain + domain + frameid;
			document.querySelector("#f" + frameid + ".scripts").appendChild(jsList);

			var scriptNode = document.createElement("div");
			scriptNode.className = "jslist";
			document.querySelector("#f" + frameid + ".scripts").appendChild(scriptNode);

			framesAndWebsocket[frameid] = [0, 0];
			subdomainArr.forEach(function (script) {
				// console.log("Script:", script);

				if (!script.blocked) {
					checkmarkNode.checked = true;
					hostNode.className = "script";
				}

				var js = document.createElement("a");
				js.target = "_blank";
				js.className = "js";
				js.innerText = script.name.match(/[^\/]*.$/);
				var url = script.protocol + subdomainNode.innerText + domain + script.name + script.query;
				js.title = url;
				js.href = url;

				// websocket conection
				if (script.protocol.charCodeAt(0) === 119) {
					js.className = "js haswebsocket";
					websocketNode.className = "websocket haswebsocket";
					websocketNode.title = "\nWebsocket: " + (++framesAndWebsocket[frameid][1]);
				}

				var sFrameId = script.frameid;
				// if frameid exists, it's a frame
				if (sFrameId === undefined) {
					scriptNode.appendChild(js);
				}
				else {
					var activePolicy = policyList[tabInfo.frames[sFrameId].policy];
					framesNode.className = "frames hasframe";
					framesNode.title = "Frames: " + (++framesAndWebsocket[frameid][0]);

					var policyNode = document.createElement("img");
					policyNode.src = "/images/" + activePolicy + "38.png";
					policyNode.className = "frame-scope";

					var frameNumberNode = document.createElement("label");
					frameNumberNode.className = "number";
					frameNumberNode.htmlFor = "fl" + sFrameId;
					frameNumberNode.innerText = tabInfo.frames[sFrameId].numScripts;

					var frameInfoNode = document.createElement("div");
					frameInfoNode.className = "frame";
					frameInfoNode.appendChild(policyNode);
					frameInfoNode.appendChild(js);
					frameInfoNode.appendChild(frameNumberNode);
					scriptNode.appendChild(frameInfoNode);

					var scriptListToggle = document.createElement("input");
					scriptListToggle.type = "checkbox";
					scriptListToggle.hidden = true;
					scriptListToggle.id = "fl" + sFrameId;
					scriptNode.appendChild(scriptListToggle);

					var scriptList = document.createElement("div");
					scriptList.className = "scripts jslist " + activePolicy;
					scriptList.id = "f" + sFrameId;
					scriptNode.appendChild(scriptList);

					buildList(tabInfo.frames[sFrameId], sFrameId);
				}
			});

			framesNode.title = framesNode.title + websocketNode.title;
		});
	});
}

/*
 * When opening the popup we request the info about the
 * page scripts and create the DOM nodes with this info
 */
chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
	chrome.runtime.sendMessage({
		type: 0, // tab info request
		tabid: tabs[0].id
	}, function (tab) {
		// console.log("Tab info", tab);

		// not an http(s) page
		if (typeof tab === "string") {
			// console.log("Char codes:", tab.charCodeAt(0), tab.charCodeAt(1));

			var msg;
			// c from chrome
			if (tab.charCodeAt(0) === 99) {
				msg = "Internal pages";
			}
			// t from ftp
			else if (tab.charCodeAt(1) === 116) {
				msg = "FTP pages";
			}
			// i from file
			else if (tab.charCodeAt(1) === 105) {
				msg = "Open files";
			}
			msg += " are not scanned";

			var msgNode = document.createElement("p");
			var infoNode = document.createElement("p");
			msgNode.innerText = msg;
			infoNode.innerText = "Only http & https pages are checked";
			document.querySelector(".scripts").appendChild(msgNode);
			document.querySelector(".scripts").appendChild(infoNode);

			return;
		}

		/*chrome.storage.local.get("bwlist", function (pref) {
			// console.log(pref);
			blackwhitelist = pref.bwlist;
		});*/

		// save tab info in variable
		tabInfo = tab;
		tabInfo.tabid = tabs[0].id;

		// policy button reflects current policy
		document.body.className = "domain " + policyList[tab.policy];

		// Allow once is turned on, change button
		if (tabInfo.allowonce === true) {
			var node = document.querySelector("#allowonce");
			node.title = "Reload & Go back to normal settings";
			node.className = "allowonce";
			node.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path d='M22.33,12.18V7.24L20.25,9.33a7.75,7.75,0,1,0,2.09,8.1h-1.2a6.64,6.64,0,1,1-1.69-7.29l-2,2.05Z'/><rect x='11.56' y='10.98' width='2.13' height='8.04'/><rect x='15.88' y='10.98' width='2.13' height='8.04'/></svg>";
		}

		buildList(tabInfo, 0);
	});
});

/*
 * Send to background process to save new policy for the specific scope
 */
function changePolicy(policy, scope) {
	var msg = {
		type: 2,
		private: tabInfo.private,
		site: []
	};
	scope = scope.charCodeAt(0);
	switch (scope) {
		// page
		case 112: msg.site[2] = tabInfo.page;
		// site
		case 115: msg.site[1] = tabInfo.subdomain;
		// domain
		case 100: msg.site[0] = tabInfo.domain;
		// global 103
		default: msg.policy = policy;
	}
	chrome.runtime.sendMessage(msg);
}

/*
 * Relaxed mode
 * Check if we can allow from some common patterns in the url
 */
function isCommonHelpers(site) {
	if (site.domain.search(/apis|cdn|img/) > -1       ||
		site.subdomain.search(/(apis?|code)\./) === 0 ||
		site.domain === "google.com"     ||
		site.domain === "googlecode.com" ||
		site.domain === "gstatic.com")
	{
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
	var domain = tab.substring(0, tab.indexOf("."));
	if (js.includes(domain) || (domain.length > 2 && js.slice(0, 3) === domain.slice(0, 3))) {
		return true;
	}
	return false;
}

/*
 * Enable listeners when the DOM has loaded
 */
document.addEventListener("DOMContentLoaded", function () {
	document.querySelectorAll(".scopes div").forEach(function (scope) {
		scope.addEventListener("click", function (e) {
			var policy = document.body.className.split(" ")[1];
			document.body.className = e.target.id + " " + policy;
		});
	});

	document.querySelectorAll(".policies div").forEach(function (policy) {
		var fc = policy.id.charCodeAt(0);
		// allow all
		if (fc === 97) {
			policy.addEventListener("click", function (e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(0, scope);

				// change all inputs to checked (allowed)
				document.querySelectorAll(".script input").forEach(function (input) {
					input.checked = true;
				});
			});
		}
		// block all
		else if (fc === 98) {
			policy.addEventListener("click", function (e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(3, scope);

				// change all inputs to unchecked (blocked)
				document.querySelectorAll(".script input").forEach(function (input) {
					input.checked = false;
				});
			});
		}
		// filtered
		else if (fc === 102) {
			policy.addEventListener("click", function (e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(2, scope);

				// check inputs with same domain, uncheck others
				document.querySelectorAll(".script").forEach(function (host) {
					if (host.querySelector(".domain").innerText === tabInfo.domain) {
						host.firstChild.checked = true;
					}
					else {
						host.firstChild.checked = false;
					}
				});
			});
		}
		// relaxed
		else if (fc === 114) {
			policy.addEventListener("click", function (e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(1, scope);

				document.querySelectorAll(".script").forEach(function (host) {
					var jsDomain = host.querySelector(".domain").innerText;
					var jsSubDomain = host.querySelector(".subdomain").innerText;
					if (jsDomain === tabInfo.domain || isCommonHelpers({domain: jsDomain, subdomain: jsSubDomain}) || isRelated(jsDomain, tabInfo.domain)) {
						host.firstChild.checked = true;
					}
					else {
						host.firstChild.checked = false;
					}
				});
			});
		}
	});

	// allow once
	document.querySelector("#allowonce").addEventListener("click", function () {
		chrome.runtime.sendMessage({
			type: 4,
			tabId: tabInfo.tabid,
			allow: !tabInfo.allowonce
		});
	});
});
