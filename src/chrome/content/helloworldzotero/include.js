// Only create main object once
if (!Zotero.HelloWorldZotero) {
	let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
					.getService(Components.interfaces.mozIJSSubScriptLoader);
	//loader.loadSubScript("chrome://helloworldzotero/content/d3.v3.js");
	loader.loadSubScript("chrome://helloworldzotero/content/hello.js");
}
