/*
 * To translate the policy number to text
 */
var scopeList = ["allowall", "relaxed", "filtered", "blockall", "blockall", "blockall"]

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
	chrome.runtime.sendMessage({tabid: tabs[0].id}, function(tab, bwlist) {
		console.log("Tab info", tab);

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
				msg = "Open files"
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

		tabInfo = tab;

		var hostNode;
		var input;
		var domainNode;
		var subdomainNode;
		var number;

		// policy button reflects current policy
		document.body.className = "domain " + scopeList[tab.policy];

		// build script list
		for (var domain in tab.scripts) {

			// console.log("Domain:", domain);

			for (var subdomain in tab.scripts[domain]) {

				// console.log("Sub-domain:", subdomain);

				hostNode = document.createElement("div");
				input = document.createElement("input");
				subdomainNode = document.createElement("span");
				domainNode = document.createElement("span");
				number = document.createElement("span");

				hostNode.setAttribute("class", "script blocked");
				input.setAttribute("type", "checkbox");
				subdomainNode.setAttribute("class", "subdomain");
				domainNode.setAttribute("class", "domain");
				number.setAttribute("class", "number");

				subdomainNode.innerText = subdomain + ((subdomain.length > 0)? "." : "");
				domainNode.innerText = domain;
				number.innerText = tab.scripts[domain][subdomain].length;

				hostNode.appendChild(input);
				hostNode.appendChild(subdomainNode);
				hostNode.appendChild(domainNode);
				hostNode.appendChild(number);
				document.querySelector(".scripts").appendChild(hostNode);

				for (var i = 0; i < tab.scripts[domain][subdomain].length; i++) {
					var script = tab.scripts[domain][subdomain][i];

					// console.log(script);

					if (!script.blocked) {
						input.setAttribute("checked", "true");
						hostNode.setAttribute("class", "script");
					}

					// Temp
					/*var scriptNode = document.createElement("div");
					scriptNode.className = "script";
					var name = document.createElement("span");
					name.className = "subdomain";
					name.innerText = script.name;
					scriptNode.appendChild(name);
					document.querySelector(".scripts").appendChild(scriptNode);*/
				}
			}
		}
	});
});

/*
 * Enable listeners when the DOM has loaded
 */
document.addEventListener("DOMContentLoaded", function() {
	var scopes = document.querySelectorAll(".scopes div");
	var policies = document.querySelectorAll(".policies div");

	for (var i = scopes.length - 1; i >= 0; i--) {
		scopes[i].addEventListener("click", function(e) {
			var scope = document.body.className.split(" ");
			document.body.className = e.target.id + " " + scope[1];
		});
	}

	for (var i = policies.length - 1; i >= 0; i--) {
		var fc = policies[i].id.charCodeAt(0);
		// allow all
		if (fc === 97) {
			policies[i].addEventListener("click", function(e) {
				var policy = document.body.className.split(" ");
				document.body.className = policy[0] + " " + e.target.id;

				// change all inputs to checked (allowed)
				var inputs = document.querySelectorAll("input");
				for (var i = inputs.length - 1; i >= 0; i--) {
					inputs[i].setAttribute("checked", "true");
				}
			});
		}
		// block all
		else if (fc === 98) {
			policies[i].addEventListener("click", function(e) {
				var policy = document.body.className.split(" ");
				document.body.className = policy[0] + " " + e.target.id;

				// change all inputs to unchecked (blocked)
				var inputs = document.querySelectorAll("input");
				for (var i = inputs.length - 1; i >= 0; i--) {
					inputs[i].removeAttribute("checked");
				}
			});
		}
		// Filtered
		else if (fc === 102) {
			policies[i].addEventListener("click", function(e) {
				var policy = document.body.className.split(" ");
				document.body.className = policy[0] + " " + e.target.id;

				// check inputs with same domain, uncheck others
				var hosts = document.querySelectorAll(".script");
				for (var i = hosts.length - 1; i >= 0; i--) {
					if (hosts[i].querySelector(".domain").innerText === tabInfo.domain) {
						hosts[i].firstChild.setAttribute("checked", "true");
					}
					else {
						hosts[i].firstChild.removeAttribute("checked");
					}
				}
			});
		}
		// relaxed
		else if (fc === 114) {
			policies[i].addEventListener("click", function(e) {
				var policy = document.body.className.split(" ");
				document.body.className = policy[0] + " " + e.target.id;

				var hosts = document.querySelectorAll(".script");
				for (var i = hosts.length - 1; i >= 0; i--) {
					var jsDomain = hosts[i].querySelector(".domain").innerText;
					var jsSubDomain = hosts[i].querySelector(".subdomain").innerText;
					if (jsDomain === tabInfo.domain || isCommonHelpers({domain: jsDomain, subdomain: jsSubDomain}) || isRelated(jsDomain, tabInfo.domain)) {
						hosts[i].firstChild.setAttribute("checked", "true");
					}
					else {
						hosts[i].firstChild.removeAttribute("checked");
					}
				}
			});
		}
	}
});

/*
 * Relaxed mode - Copy from background process
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
 * Relaxed mode - Copy from background process
 * Check if the domain name of the site is in the domain of the script
 * If tab domain is bigger, search for the inverse
 *
 * Algorithm from ScriptWeeder
 */
function isRelated(js, tab) {
	if (tab.length > js.length) {
		return isRelated(tab, js);
	}
	var domain = tab.slice(0, tab.indexOf("."));
	if (js.includes(domain)) {
		return true;
	}
	if (domain.length > 2 && js.slice(0, 3) === domain.slice(0, 3)) {
		return true;
	}
	return false;
}
