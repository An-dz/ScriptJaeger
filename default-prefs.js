"use strict";

/**
 * @var preferences [Object] These are the default settings after
 * first run
 *
 * This file is injected on demand in files that already contain
 * this object.
 */
preferences = {
	rule: 1,
	private: 1,
	urls: {
		"amazon.com": {
			rule: null,
			rules: {
				urls: {
					"amazon-adsystem.com": {
						rule: true,
						urls: {}
					},
					"media-amazon.com": {
						rule: true,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"duckduckgo.com": {
			rule: 0,
			rules: {urls: {}},
			urls: {}
		},
		"duolingo.com": {
			rule: 1,
			rules: {
				urls: {
					"cloudfront.net": {
						rule: null,
						urls: {
							"d35aaqx5ub95lt": {
								rule: false,
								urls: {}
							}
						}
					}
				}
			},
			urls: {}
		},
		"facebook.com": {
			rule: null,
			rules: {
				urls: {
					"fbcdn.net": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"jsfiddle.net": {
			rule: null,
			rules: {
				urls: {
					"jshell.net": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"linkedin.com": {
			rule: null,
			rules: {
				urls: {
					"linkedin.com": {
						rule: true,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"live.com": {
			rule: 2,
			rules: {
				urls: {
					// onedrive
					"1drv.com": {
						rule: false,
						urls: {}
					},
					"gfx.ms": {
						rule: false,
						urls: {}
					},
					// outlook contacts
					"office.com": {
						rule: false,
						urls: {}
					},
					// outlook
					"office365.com": {
						rule: false,
						urls: {}
					},
					// office apps
					"office.net": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {
				"onedrive": {
					rule: null,
					rules: {
						urls: {
							// download data
							"1drv.com": {
								rule: false,
								urls: {}
							},
							"akamaihd.net": {
								rule: false,
								urls: {}
							},
							// loads the main bar
							"outlook.com": {
								rule: false,
								urls: {}
							},
							// loads free space statistics
							"sfx.ms": {
								rule: false,
								urls: {}
							}
						}
					},
					urls: {}
				}
			}
		},
		"microsoft.com": {
			rule: null,
			rules: {
				urls: {
					"gfx.ms": {
						rule: false,
						urls: {}
					},
					"microsoft.com": {
						rule: null,
						urls: {
							"c": {
								rule: true,
								urls: {}
							},
							"fpt": {
								rule: true,
								urls: {}
							},
							"web.vortex.data": {
								rule: true,
								urls: {}
							}
						}
					},
					"onestore.ms": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {
				"support": {
					rule: null,
					rules: {
						urls: {
							"akamaized.net": {
								rule: false,
								urls: {}
							}
						}
					},
					urls: {}
				}
			}
		},
		"netflix.com": {
			rule: null,
			rules: {
				urls: {
					"gstatic.com": {
						rule: true,
						urls: {}
					},
					"netflix.com": {
						rule: true,
						urls: {}
					},
					"nflxext.com": {
						rule: false,
						urls: {}
					},
					"nflximg.net": {
						rule: true,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"sina.com.cn": {
			rule: null,
			rules: {
				urls: {
					"sina.com.cn": {
						rule: null,
						urls: {
							"d0": {
								rule: true,
								urls: {}
							},
							"d1": {
								rule: true,
								urls: {}
							},
							"d2": {
								rule: true,
								urls: {}
							},
							"d3": {
								rule: true,
								urls: {}
							},
							"d4": {
								rule: true,
								urls: {}
							},
							"d5": {
								rule: true,
								urls: {}
							},
							"d6": {
								rule: true,
								urls: {}
							},
							"d7": {
								rule: true,
								urls: {}
							},
							"d8": {
								rule: true,
								urls: {}
							},
							"interest.mix": {
								rule: true,
								urls: {}
							},
						}
					}
				}
			},
			urls: {}
		},
		"skype.com": {
			rule: null,
			rules: {
				urls: {
					"akamaized.net": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"startpage.com": {
			rule: 0,
			rules: {urls: {}},
			urls: {}
		},
		"wikia.com": {
			rule: null,
			rules: {
				urls: {
					"nocookie.net": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {}
		},
		"xbox.com": {
			rule: null,
			rules: {
				urls: {
					"akamaized.net": {
						rule: false,
						urls: {}
					},
					"gfx.ms": {
						rule: false,
						urls: {}
					},
					"microsoft.com": {
						rule: false,
						urls: {}
					}
				}
			},
			urls: {}
		}
	},
	rules: {
		urls: {
			// your local sites
			"localhost": {
				rule: false,
				urls: {}
			},
			// ads on Chinese sites
			"360buyimg.com": {
				rule: true,
				urls: {}
			},
			// ads on Chinese sites
			"alicdn.com": {
				rule: null,
				urls: {
					"tbip": {
						rule: true,
						urls: {}
					}
				}
			},
			// advertising
			"aolcdn.com": {
				rule: true,
				urls: {}
			},
			// known good cdn
			"cloudflare.com": {
				rule: null,
				urls: {
					"ajax": {
						rule: false,
						urls: {}
					},
					"cdnjs": {
						rule: false,
						urls: {}
					}
				}
			},
			// gaming tracker
			"cursecdn.com": {
				rule: true,
				urls: {}
			},
			// tracker
			"dotomi.com": {
				rule: true,
				urls: {}
			},
			// Facebook (blacklisted here, but whitelisted on facebook.com)
			"fbcdn.net": {
				rule: true,
				urls: {}
			},
			"google.com": {
				rule: null,
				urls: {
					// +1 stuff
					"apis": {
						rule: true,
						urls: {}
					},
					"maps": {
						rule: false,
						urls: {}
					}
				}
			},
			// javascript libraries
			"googleapis.com": {
				rule: null,
				urls: {
					"ajax": {
						rule: false,
						urls: {}
					},
					"maps": {
						rule: false,
						urls: {}
					}
				}
			},
			// sites built with wix
			"parastorage.com": {
				rule: false,
				urls: {}
			},
			// Tumblr sites
			"tumblr.com": {
				rule: null,
				urls: {
					"assets": {
						rule: false,
						urls: {}
					}
				}
			},
			// Twitter widgets (tracker)
			"twimg.com": {
				rule: null,
				urls: {
					"widgets": {
						rule: true,
						urls: {}
					}
				}
			},
			// Allow Vimeo frames
			"vimeo.com": {
				rule: false,
				urls: {}
			},
			// Allow YouTube frames
			"youtube.com": {
				rule: false,
				urls: {}
			},
			// Allow no cookie version of YouTube frames
			"youtube-nocookie.com": {
				rule: false,
				urls: {}
			},
			// Youtube images
			"ytimg.com": {
				rule: null,
				urls: {
					"s": {
						rule: false,
						urls: {}
					}
				}
			}
		}
	}
};

/**
 * @brief Callee to update preferences
 *
 * Call a function when the file has loaded to let the
 * caller know when the preferences has been replaced.
 *
 * @note This function must exist in the script that injects this file
 */
defaultPreferencesLoaded();
