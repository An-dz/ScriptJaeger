# ScriptJäger
__Der ScriptJäger - die Erweiterung für den Jägermeister!__

ScriptJäger is a script, frame and websocket connection management extension, it allows you to control which domains are allowed to load those resources for each page.

ScriptJäger is inspired by [ScriptWeeder](https://github.com/lemonsqueeze/scriptweeder) by lemonsqueeze.

## How it works
ScriptJäger only checks for scripts, frames and websocket connections on the http, https and file protocols, traffic from other resource types or protocols are not intercepted.

ScriptJäger was created to be lightweigth, fast, powerful & easy-to-use. Anything is only loaded when really required.

ScriptJäger is tested only under the [Vivaldi browser](https://vivaldi.com/) and may not work on other Chromium browsers, including Chromium itself. No matter which browser you are using remember to include this info when reporting a bug.

Check the [wiki](https://github.com/An-dz/ScriptJaeger/wiki) for info on how to use it.

## Download
A _'stable'_ version of the extension as a CRX file can be downloaded on the [releases](https://github.com/An-dz/ScriptJaeger/releases) page. The extension automatically checks for updates every 24 hours and will notify you of updates, if you cancel the notification a new one will be shown in the next 24 hours. The update check will send a normal GET request to GitHub to download the latest manifest file here, no other information is sent.

After downloading the latest CRX just drag and drop it inside the <vivaldi://extensions/> page.

This extension is not available on Chrome Web Store, if it ever becomes available on it this notice will be removed and a link to the store will be added. There are two reasons for this:

* You must pay a fee to be there  
Yes, I must pay to help them make their browser more popular
* This fee is their verification method  
Yes, you pay and you are verified, this gives no protection to the user

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
* alarms  
To check for updates
* notifications  
To notify you about an update
