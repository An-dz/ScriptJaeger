/*
 * To translate the policy number to text
 */
var scopeList = ["allowall", "relaxed", "filtered", "blockall", "blockall", "blockall"];

/*
 * Holds data obtained from the background process
 */
var tabInfo = {};
var blackwhitelist = {};

/*
 * When opening the popup we request the info about the
 * page scripts and create the DOM nodes with this info
 */
chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
	chrome.runtime.sendMessage({
		type: 0, // tab info request
		tabid: tabs[0].id
	}, function(tab) {
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

		/*chrome.storage.local.get("bwlist", function(pref) {
			// console.log(pref);
			blackwhitelist = pref.bwlist;
		});*/

		// save tab info in variable
		tabInfo = tab;
		tabInfo.tabid = tabs[0].id;

		// policy button reflects current policy
		document.body.className = "domain " + scopeList[tab.policy];

		buildList(tabInfo, 0);
	});
});

/*
 * Build script list
 */
function buildList(frmInfo, frameid) {
	for (var domain in frmInfo.scripts) {
		// console.log("Domain:", domain);

		for (var subdomain in frmInfo.scripts[domain]) {
			// console.log("Sub-domain:", subdomain);

			var hostNode = document.createElement("div");
			var input = document.createElement("input");
			var subdomainNode = document.createElement("span");
			var domainNode = document.createElement("span");
			var number = document.createElement("label");

			hostNode.className = "script blocked";
			subdomainNode.className = "subdomain";
			domainNode.className = "domain";
			number.className = "number";

			input.type = "checkbox";
			number.htmlFor = subdomain + domain + frameid;

			subdomainNode.innerText = subdomain + ((subdomain.length > 0)? "." : "");
			domainNode.innerText = domain;
			number.innerText = frmInfo.scripts[domain][subdomain].length;

			hostNode.appendChild(input);
			hostNode.appendChild(subdomainNode);
			hostNode.appendChild(domainNode);
			hostNode.appendChild(number);
			document.querySelector("#f" + frameid + ".scripts").appendChild(hostNode);

			// save script exception
			hostNode.addEventListener("click", function(e) {
				var target = e.target;
				var char = target.tagName.charCodeAt(0);
				// console.log("Char code:", char);
				// clicking the 'l'abel for checking individual scripts should not trigger
				if (char === 76) {
					return;
				}
				// if hostname or checkmark then move to parent node
				if (char !== 68) {
					target = target.parentNode;
				}
				var input = target.querySelector("input");
				// not clicking over checkmark should invert its state
				if (char === 83 || char === 68) {
					input.checked = !input.checked;
				}
				// The background script deals with it because the popup process will die on close
				chrome.runtime.sendMessage({
					type: 1, // save script exception
					tabid: tabInfo.tabid,
					scope: document.body.className.charCodeAt(0),
					private: tabInfo.private,
					script: {
						domain: target.querySelector(".domain").innerText,
						subdomain: target.querySelector(".subdomain").innerText.slice(0,-1),
						// @here: true means checked which means allow
						// @blackwhitelist: true means block
						rule: !input.checked
					}
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

			for (var i = 0; i < frmInfo.scripts[domain][subdomain].length; i++) {
				var script = frmInfo.scripts[domain][subdomain][i];

				// console.log("Script:", script);

				if (!script.blocked) {
					input.checked = true;
					hostNode.className = "script";
				}

				var js = document.createElement("a");
				js.target = "_blank";
				js.className = "js";
				js.innerText = script.name.match(/[^/]+.$/);
				var url = script.protocol + subdomainNode.innerText + domain + script.name + script.query;
				js.title = url;
				js.href = url;

				var sFrameId = script.frameid;
				// if frameid exists, it's a frame
				if (sFrameId === undefined) {
					scriptNode.appendChild(js);
				}
				else {
					scriptNode.appendChild(js);
					var frameNode = document.createElement("div");
					frameNode.className = "scripts";
					frameNode.id = "f" + sFrameId;
					scriptNode.appendChild(frameNode);
					buildList(tabInfo.frames[sFrameId], sFrameId);
				}
			}
		}
	}
}

/*
 * Enable listeners when the DOM has loaded
 */
document.addEventListener("DOMContentLoaded", function() {
	var scopes = document.querySelectorAll(".scopes div");
	var policies = document.querySelectorAll(".policies div");

	for (var i = scopes.length - 1; i >= 0; i--) {
		scopes[i].addEventListener("click", function(e) {
			var policy = document.body.className.split(" ")[1];
			document.body.className = e.target.id + " " + policy;
		});
	}

	for (var i = policies.length - 1; i >= 0; i--) {
		var fc = policies[i].id.charCodeAt(0);
		// allow all
		if (fc === 97) {
			policies[i].addEventListener("click", function(e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(0, scope);

				// change all inputs to checked (allowed)
				var inputs = document.querySelectorAll(".script input");
				for (var i = inputs.length - 1; i >= 0; i--) {
					inputs[i].checked = true;
				}
			});
		}
		// block all
		else if (fc === 98) {
			policies[i].addEventListener("click", function(e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(3, scope);

				// change all inputs to unchecked (blocked)
				var inputs = document.querySelectorAll(".script input");
				for (var i = inputs.length - 1; i >= 0; i--) {
					inputs[i].checked = false;
				}
			});
		}
		// filtered
		else if (fc === 102) {
			policies[i].addEventListener("click", function(e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(2, scope);

				// check inputs with same domain, uncheck others
				var hosts = document.querySelectorAll(".script");
				for (var i = hosts.length - 1; i >= 0; i--) {
					if (hosts[i].querySelector(".domain").innerText === tabInfo.domain) {
						hosts[i].firstChild.checked = true;
					}
					else {
						hosts[i].firstChild.checked = false;
					}
				}
			});
		}
		// relaxed
		else if (fc === 114) {
			policies[i].addEventListener("click", function(e) {
				var scope = document.body.className.split(" ")[0];
				document.body.className = scope + " " + e.target.id;

				changePolicy(1, scope);

				var hosts = document.querySelectorAll(".script");
				for (var i = hosts.length - 1; i >= 0; i--) {
					var jsDomain = hosts[i].querySelector(".domain").innerText;
					var jsSubDomain = hosts[i].querySelector(".subdomain").innerText;
					if (jsDomain === tabInfo.domain || isCommonHelpers({domain: jsDomain, subdomain: jsSubDomain}) || isRelated(jsDomain, tabInfo.domain)) {
						hosts[i].firstChild.checked = true;
					}
					else {
						hosts[i].firstChild.checked = false;
					}
				}
			});
		}
	}
});

/*
 * Send to background process to save new policy for the specific scope
 */
function changePolicy(policy, scope) {
	var msg = {
		type: 2,
		private: tabInfo.private
	}
	scope = scope.charCodeAt(0);
	switch (scope) {
		// page
		case 112: msg.page = tabInfo.page;
		// site
		case 115: msg.subdomain = tabInfo.subdomain;
		// domain
		case 100: msg.domain = tabInfo.domain;
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
	if (site.domain.search(/apis|cdn|img/) > -1      ||
		site.subdomain.search(/(apis?|code)\./) === 0 ||
		site.domain === "google.com"     ||
		site.domain === "googlecode.com" ||
		site.domain === "gstatic.com")
	{
		return true
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
