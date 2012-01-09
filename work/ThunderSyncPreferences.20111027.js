/**
 * Preferences logic for ThunderSync.
 * Copyright (C) 2011 Frank Abelbeck <frank.abelbeck@googlemail.com>
 * 
 * This file is part of the Mozilla Thunderbird extension "ThunderSync."
 * 
 * ThunderSync is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * ThunderSync is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with ThunderSync; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * or see <http://www.gnu.org/licenses/>.
 *
 * $Id: ThunderSyncPreferences.js 17 2011-02-20 21:11:29Z frank $
 */

var ThunderSyncPref = {
	/**
	 * Called when preferences dialog is loaded: fill dialog elements
	 * and store preferences in this object.
	 * 
	 * This is necessary because only one set of preferences GUI controls
	 * is used. These need to be updated depending on the currently selected
	 * addressbook. And addressbook-specific preferences can only be stored
	 * in Thunderbird's PrefService when the user chooses "OK", i.e. accepts
	 * the changes. Otherwise the changes get discarded when the preferences
	 * dialog is closed.
	 */
	load: function () {
		//
		// access preferences system and prepare in-object storage
		//
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService);
		
		var abPrefs       = prefs.getBranch("extensions.ThunderSync.Addressbooks.");
		var formatPrefs   = prefs.getBranch("extensions.ThunderSync.exportFormat.");
		var vCardExpPrefs = prefs.getBranch("extensions.ThunderSync.vCard.exportEncoding.");
		var vCardImpPrefs = prefs.getBranch("extensions.ThunderSync.vCard.importEncoding.");
		var startUpPrefs  = prefs.getBranch("extensions.ThunderSync.startUp.");
		var shutDownPrefs = prefs.getBranch("extensions.ThunderSync.shutdown.");
		var syncModePrefs = prefs.getBranch("extensions.ThunderSync.syncMode.");
		var filterPrefs   = prefs.getBranch("extensions.ThunderSync.filter.");
		
		this.ConfigPath        = new Object();
		this.ConfigFormat      = new Object();
		this.ConfigStartUp     = new Object();
		this.ConfigShutDown    = new Object();
		this.ConfigSyncMode    = new Object();
		this.ConfigvCardExpEnc = new Object();
		this.ConfigvCardImpEnc = new Object();
		
		//
		// read all addressbooks, fill list in preferences dialog
		//
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var allAddressBooks = abManager.directories;
		var ablist = document.getElementById("ThunderSyncPreferences.list.addressbook");
		while (allAddressBooks.hasMoreElements()) {
			var addressBook = allAddressBooks.getNext();
			if (addressBook instanceof Components.interfaces.nsIAbDirectory)
			{
				var fileName = addressBook.fileName.replace(".mab","");
				var item = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listitem"
				);
				item.setAttribute("crop","end");
				item.setAttribute("label",addressBook.dirName);
				item.setAttribute("value",fileName);
				item.setAttribute("class","ThunderSyncPreferences.listitem.addressbookname");
				
				//
				// store addressbook preferences
				//
				try {
					this.ConfigPath[fileName] = abPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigPath[fileName] = "";
					abPrefs.setCharPref(fileName,"");
				}
				
				try {
					this.ConfigFormat[fileName] = formatPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigFormat[fileName] = "vcard";
					formatPrefs.setCharPref(fileName,"vcard");
				}
				
				try {
					this.ConfigStartUp[fileName] = startUpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigStartUp[fileName] = "no";
					startUpPrefs.setCharPref(fileName,"no");
				}
				
				try {
					this.ConfigShutDown[fileName] = shutDownPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigShutDown[fileName] = "no";
					shutDownPrefs.setCharPref(fileName,"no");
				}
				
				try {
					this.ConfigSyncMode[fileName] = syncModePrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigSyncMode[fileName] = "ask";
					syncModePrefs.setCharPref(fileName,"ask");
				}
				
				try {
					this.ConfigvCardExpEnc[fileName] = vCardExpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigvCardExpEnc[fileName] = "UTF-8";
					vCardExpPrefs.setCharPref(fileName,"UTF-8");
				}
				
				try {
					this.ConfigvCardImpEnc[fileName] = vCardImpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigvCardImpEnc[fileName] = "Standard";
					vCardImpPrefs.setCharPref(fileName,"Standard");
				}
				
				ablist.appendChild(item);
			}
		}
		
		document.getElementById("ThunderSyncPreferences.list.addressbook").selectedIndex = 0;
	},
	
	/**
	 * 
	 */
	changeAddressbook: function (abItem) {
		var format       = this.ConfigFormat[abItem.value];
		var impEnc       = this.ConfigvCardImpEnc[abItem.value];
		var expEnc       = this.ConfigvCardExpEnc[abItem.value];
		var syncMode     = this.ConfigSyncMode[abItem.value];
		var syncStartUp  = this.ConfigStartUp[abItem.value];
		var syncShutDown = this.ConfigShutDown[abItem.value];
		
		//
		// set path to preference string value
		//
		document.getElementById("ThunderSyncPreferences.edit.path").value = this.ConfigPath[abItem.value];
		
		//
		// set export format dropdown box to preference value
		//
		var list = document.getElementById("ThunderSyncPreferences.menulist.format");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.format");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == format) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
		
		switch (format) {
			case "vcard":
				//
				// set import encoding dropdown box to preference value
				//
				var list = document.getElementById("ThunderSyncPreferences.menulist.importencoding");
				var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.encoding");
				for (var i=0;i<items.length;i++) {
					if (items[i].value == impEnc) {
						list.selectedIndex = list.getIndexOfItem(items[i]);
						break;
					}
				}
				//
				// set export encoding dropdown box to preference value
				//
				var list = document.getElementById("ThunderSyncPreferences.menulist.exportencoding");
				var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.encoding");
				for (var i=0;i<items.length;i++) {
					if (items[i].value == expEnc) {
						list.selectedIndex = list.getIndexOfItem(items[i]);
						break;
					}
				}
				break;
		}
		
		//
		// set sync-on-start-up dropdown box to preference value
		//
		var list = document.getElementById("ThunderSyncPreferences.menulist.syncOnStartup");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.autoSync");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == syncStartUp) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
		
		//
		// set standard sync mode dropdown box to preference value
		//
		var list = document.getElementById("ThunderSyncPreferences.menulist.syncMode");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.autoSync");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == syncMode) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
		
		//
		// set sync-on-shutdown dropdown box to preference value
		//
		var list = document.getElementById("ThunderSyncPreferences.menulist.syncOnShutdown");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.autoSync");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == syncShutDown) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
	},
	
	/**
	 * When user acknowledges changes (i.e. accepts dialog), all preferences get set
	 */
	accept: function () {
		//
		// todo: save preferences in this.Config... for each addressbook
		//
		
/*
		var items = document.getElementById("ThunderSyncPreferences.list.addressbook")
				.getElementsByClassName("ThunderSyncPreferences.cell.addressbookpath");
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.");
		for (var i = 0; i < items.length; i++) {
			prefs.setCharPref(
				items[i].getAttribute("value"),
				items[i].getAttribute("label")
			);
		}
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
		prefs.setCharPref("exportFormat",
			document.getElementById("ThunderSyncPreferences.menulist.format")
			.selectedItem.value);
		prefs.setCharPref("exportEncoding",
			document.getElementById("ThunderSyncPreferences.menulist.exportencoding")
			.selectedItem.value);
		prefs.setCharPref("importEncoding",
			document.getElementById("ThunderSyncPreferences.menulist.importencoding")
			.selectedItem.value);
		prefs.setCharPref("syncOnStartup",
			document.getElementById("ThunderSyncPreferences.menulist.syncOnStartup")
			.selectedItem.value);
		prefs.setCharPref("syncOnShutdown",
			document.getElementById("ThunderSyncPreferences.menulist.syncOnShutdown")
			.selectedItem.value);
		return true;
*/
	},
	
	/**
	 * User wants to delete the path of an addressbook he selected: do it
	 */
	clearPath: function () {
		var row = document.getElementById("ThunderSyncPreferences.list.addressbook")
			.getSelectedItem(0);
		var path = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookpath")[0];
		var name = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookname")[0];
		row.removeAttribute("tooltiptext");
		path.setAttribute("label","");
	},
	
	/**
	 * User changed the export format: show additional options
	 * (for now this apply for vCard only)
	 */
	updateExportFormat: function () {
		if (document.getElementById("ThunderSyncPreferences.menulist.format").selectedItem.value == "vcard") {
			document.getElementById("ThunderSyncPreferences.gridrow.importencoding")
				.setAttribute("collapsed","false");
			document.getElementById("ThunderSyncPreferences.gridrow.exportencoding")
				.setAttribute("collapsed","false");
		}
		else {
			document.getElementById("ThunderSyncPreferences.gridrow.importencoding")
				.setAttribute("collapsed","true");
			document.getElementById("ThunderSyncPreferences.gridrow.exportencoding")
				.setAttribute("collapsed","true");
		}
	},
	
	/**
	 * Open a file picker dialog which only allows a directory selection.
	 * Set path of addressbook in the dialog's list.
	 */
	openPathDialog: function () {
		// create and execute file selection dialog
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
		fp.init(window, "Dialog Title", nsIFilePicker.modeOpen);
		var rv = fp.show();
		
		// process selected path if file selection dialog returned with success
		if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
			var paths = document
				.getElementById("ThunderSyncPreferences.list.addressbook")
				.getElementsByClassName("ThunderSyncPreferences.cell.addressbook");
			// check all addressbooks in dialog for path collisions
			var doublette = false;
			for (var i = 0; i < paths.length; i++) {
				if (paths[i].getAttribute("label") == fp.file.path) {
					doublette = true;
					break;
				}
			}
			if (!doublette) {
				// path seems to be unique with regard to addressbooks
				// apply in list
				var row = document
					.getElementById("ThunderSyncPreferences.list.addressbook")
					.getSelectedItem(0);
				var path = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookpath")[0];
				var name = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookname")[0];
				path.setAttribute("label",fp.file.path);
				row.setAttribute("tooltiptext",
					name.getAttribute("label") + ": " + fp.file.path
				);
			}
			else {
				// path already assigned to another addressbook:
				// show an error message
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
				var stringsBundle = document.getElementById("string-bundle");
				promptService.alert(
					null,
					stringsBundle.getString("titleError"),
					stringsBundle.getString("textError")
				);
			}
		}
	},
	
	openFilterDialog: function () {
	}
	
}

