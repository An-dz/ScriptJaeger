# ScriptJäger
__Der ScriptJäger - die Erweiterung für der Jägermeister!__

ScriptJäger is a script management extension, it allows you to control which scripts each page can load. ScriptJäger is inspired by [ScriptWeeder](https://github.com/lemonsqueeze/scriptweeder) by lemonsqueeze.

## How it works
ScriptJäger only checks for scripts and sub-frames in the http & https protocols, traffic from other resource types or protocols are not intercepted.

ScriptJäger was created to be lightweigth, fast, powerful & easy-to-use. Anything is only loaded when really required.

ScriptJäger is tested only under the [Vivaldi browser](https://vivaldi.com/) and may not work on other Chromium browsers, including Chromium itself. No matter which browser you are using remember to include this info when reporting a bug.

## Download
This extension is not available on Chrome Web Store, if it ever becomes available on it this notice will be removed and a link to the store will be added. There are two reasons for this:

* You must pay a fee to be there  
Yes, I must pay to help them make their browser more popular
* This fee is their verification method  
Yes, you pay and you are verified, how does this protect the user?

For the current moment this extension is still not enough stable for distribution. It's on the roadmap to offer a compiled extension as CRX through GitHub and for the extension to check for updates and at least notify of new updates.

## Permissions
This extension requests some permissions, here's why it requires each one:

* tabs  
To be able to access the tabs url and so apply the rules
* storage  
To save & load preferences
* webNavigation  
To know which kind of redirection it is to update the popup accordingly, preventing resetting of information on dynamically loaded pages like YouTube, Facebook & Twitter
* webRequest & webRequestBlocking  
To be able to intercept the scripts before requesting them and then block if necessary
* \<all_urls>  
To work in any page
