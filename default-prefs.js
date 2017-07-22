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
					name: "d7mj4aqfscim2",
					rule: false
				}]
			}]
		}
	},{
		name: "instagram.com",
		rule: 1,
		rules: {
			domains: [{
				name: "akamaihd.net",
				sites: [{
					name: "instagramstatic-a",
					rule: false
				}]
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
		name: "gfx.ms", // Microsoft live account
		rule: false
	},{
		name: "pfx.ms", // Microsoft live account
		rule: false
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
