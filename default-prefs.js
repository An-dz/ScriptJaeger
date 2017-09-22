/*
 * These are the default settings after first run
 */
policy = {
	rule: 1,
	private: 1,
	domains: [{
		name: "duckduckgo.com",
		rule: 0
	},{
		name: "duolingo.com",
		rule: 1,
		rules: {
			domains: [{
				name: "cloudfront.net",
				sites: [{
					name: "d35aaqx5ub95lt",
					rule: false
				},{
					name: "d7mj4aqfscim2",
					rule: false
				}]
			}]
		}
	},{
		name: "facebook.com",
		rules: {
			domains: [{
				name: "fbcdn.net",
				rule: false
			}]
		}
	},{
		name: "live.com",
		sites: [{
			name: "onedrive",
			rules: {
				domains: [{
					name: "akamaihd.net", // needs 
					sites: [{
						name: "spoprod-a",
						rule: false
					}]
				},{
					name: "1drv.com", // download data
					rule: false
				},{
					name: "outlook.com", // loads the main bar
					rule: false
				},{
					name: "sfx.ms", // loads free space statistics
					rule: false
				}]
			}
		}],
		rules: {
			domains: [{
				name: "office.net", // Office apps
				rule: false
			},{
				name: "gfx.ms",
				rule: false
			}]
		}
	},{
		name: "microsoft.com",
		rules: {
			domains: [{
				name: "onestore.ms",
				rule: false
			},{
				name: "akamaized.net",
				rule: false
			},{
				name: "gfx.ms",
				rule: false
			}]
		}
	},{
		name: "netflix.com",
		rule: 1,
		rules: {
			domains: [{
				name: "nflxext.com",
				sites: [{
					name: "assets",
					rule: false
				}]
			}]
		}
	},{
		name: "onenote.com",
		rule: 2,
		rules: {
			domains: [{
				name: "aspnetcdn.com",
				rule: false
			},{
				name: "onenote.net",
				rule: false
			}]
		}
	},{
		name: "slack.com",
		rule: 1,
		rules: {
			domains: [{
				name: "fastly.net",
				sites: [{
					name: "slack.global.ssl",
					rule: false
				}]
			}]
		}
	},{
		name: "startpage.com",
		rule: 0
	}]
};

blackwhitelist = {
	domains: [{
		name: "localhost",
		rule: false
	},{
		name: "aspnetcdn.com",
		sites: [{
			name: "ajax",
			rule: false
		}]
	},{
		name: "cloudflare.com",
		sites: [{
			name: "cdnjs",
			rule: false
		}]
	},{
		name: "jquery.com",
		sites: [{
			name: "code",
			rule: false
		}]
	},{
		name: "tumblr.com",
		sites: [{
			name: "assets",
			rule: false
		}]
	},{
		name: "google.com",
		sites: [{
			name: "maps",
			rule: false
		},{
			name: "apis", // +1 stuff
			rule: true
		}]
	},{
		name: "gstatic.com",
		sites: [{
			name: "maps",
			rule: false
		}]
	},{
		name: "vimeo.com", // Allow Vimeo frames
		rule: false
	},{
		name: "youtube.com", // Allow YouTube frames
		rule: false
	},{
		name: "ytimg.com",
		sites: [{
			name: "s", // Youtube images
			rule: false
		}]
	},{
		name: "fbcdn.net", // Facebook
		rule: true
	},{
		name: "twimg.com", // Twitter
		sites: [{
			name: "widgets",
			rule: true
		}]
	}]
};

/*
 * Call a function when the file has loaded to let the
 * caller know when the preferences has been replaced
 */
defaultPreferencesLoaded();
