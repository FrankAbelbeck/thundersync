Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

//
// Start up routines
// by Lucas Treffenstädt
//

function ThunderSync() {
  // constructor
  this.init();
}

ThunderSync.prototype = {
  classDescription: "ThunderSync XPCOM Component",
  classID: Components.ID("{f55a44cc-dabf-4390-8ec0-8898f3d646d0}"),
  contractID: "@lucas.treffenstaedt.de/thundersync;1",
  _xpcom_categories: [{category: "profile-after-change", entry: "ThunderSync"}], // Gecko 1.9.2 compatibility
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIThunderSync]),

  forcequit: function() {
    try {
      var as = Components.interfaces.nsIAppStartup;
      Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(as).quit(as.eForceQuit);
    } catch(err) {
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      prompts.alert(null, "ThunderSync Error", err);
    }
  },

  sync: function() {
    try {
      var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
      var dialog = window.openWindow(null,'chrome://thundersync/content/ThunderSyncDialog.xul','','chrome,centerscreen,alwaysRaised,dialog',null);
    } catch(err) {
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      prompts.alert(null, "Something went wrong", err);
    }
  },

  init: function() {
    var enable = true;
    try {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      enable = prefs.getBoolPref("extensions.ThunderSync.syncOnStartup");
    } catch(err) {
      enable=false;
    }
    if(enable) {
      this.sync();
    }
  }
}

if(XPCOMUtils.generateNSGetFactory) {
  // Gecko 2.0 and newer
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([ThunderSync]);
} else {
  // Gecko 1.9.2 compatibility
  var NSGetModule = XPCOMUtils.generateNSGetModule([ThunderSync]);
}

