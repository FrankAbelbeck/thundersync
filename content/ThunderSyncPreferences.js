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
 * $Id$
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
		
		var abPrefs              = prefs.getBranch("extensions.ThunderSync.Addressbooks.");
		var formatPrefs          = prefs.getBranch("extensions.ThunderSync.exportFormat.");
		var vCardExpPrefs        = prefs.getBranch("extensions.ThunderSync.vCard.exportEncoding.");
		var vCardImpPrefs        = prefs.getBranch("extensions.ThunderSync.vCard.importEncoding.");
		var vCardUID             = prefs.getBranch("extensions.ThunderSync.vCard.hideUID.");
		var vCardQuotedPrintable = prefs.getBranch("extensions.ThunderSync.vCard.quotedPrintable.");
		var vCardFolding         = prefs.getBranch("extensions.ThunderSync.vCard.folding.");
		var startUpPrefs         = prefs.getBranch("extensions.ThunderSync.startUp.");
		var shutDownPrefs        = prefs.getBranch("extensions.ThunderSync.shutdown.");
		var syncModePrefs        = prefs.getBranch("extensions.ThunderSync.syncMode.");
		var filterPrefs          = prefs.getBranch("extensions.ThunderSync.filter.");
		
		this.ConfigPath                 = new Object();
		this.ConfigFormat               = new Object();
		this.ConfigStartUp              = new Object();
		this.ConfigShutDown             = new Object();
		this.ConfigSyncMode             = new Object();
		this.ConfigVCardExpEnc          = new Object();
		this.ConfigVCardImpEnc          = new Object();
		this.ConfigVCardUID             = new Object();
		this.ConfigVCardQuotedPrintable = new Object();
		this.ConfigVCardFolding         = new Object();
		this.ConfigFilter               = new Object();
		this.aBook = "";
		
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
				// path
				try {
					this.ConfigPath[fileName] = abPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigPath[fileName] = "";
					abPrefs.setCharPref(fileName,"");
				}
				// format
				try {
					this.ConfigFormat[fileName] = formatPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigFormat[fileName] = "vCardDir";
					formatPrefs.setCharPref(fileName,"vCardDir");
				}
				// start-up action
				try {
					this.ConfigStartUp[fileName] = startUpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigStartUp[fileName] = "no";
					startUpPrefs.setCharPref(fileName,"no");
				}
				// shutdown action
				try {
					this.ConfigShutDown[fileName] = shutDownPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigShutDown[fileName] = "no";
					shutDownPrefs.setCharPref(fileName,"no");
				}
				// standard synchronisation mode
				try {
					this.ConfigSyncMode[fileName] = syncModePrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigSyncMode[fileName] = "ask";
					syncModePrefs.setCharPref(fileName,"ask");
				}
				// vCard export charset
				try {
					this.ConfigVCardExpEnc[fileName] = vCardExpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigVCardExpEnc[fileName] = "UTF-8";
					vCardExpPrefs.setCharPref(fileName,"UTF-8");
				}
				// vCard import charset
				try {
					this.ConfigVCardImpEnc[fileName] = vCardImpPrefs.getCharPref(fileName);
				} catch (exception) {
					this.ConfigVCardImpEnc[fileName] = "Standard";
					vCardImpPrefs.setCharPref(fileName,"Standard");
				}
				// safe UID in comment field?
				try {
					this.ConfigVCardUID[fileName] = vCardUID.getBoolPref(fileName);
				} catch (exception) {
					this.ConfigVCardUID[fileName] = false;
					vCardUID.setBoolPref(fileName,false);
				}
				// use quoted-printable encoding?
				try {
					this.ConfigVCardQuotedPrintable[fileName] = vCardQuotedPrintable.getBoolPref(fileName);
				} catch (exception) {
					this.ConfigVCardQuotedPrintable[fileName] = true;
					vCardQuotedPrintable.setBoolPref(fileName,true);
				}
				// use line folding?
				try {
					this.ConfigVCardFolding[fileName] = vCardFolding.getBoolPref(fileName);
				} catch (exception) {
					this.ConfigVCardFolding[fileName] = true;
					vCardFolding.setBoolPref(fileName,true);
				}
				
				//
				// filters are stored as string of property=action pairs:
				// "property1=action1,property2=action2,..."
				//
				this.ConfigFilter[fileName] = new Object();
				try {
					var filters = filterPrefs.getCharPref(fileName).split(",");
					for (i=0; i<filters.length; i++) {
						var pair = filters[i].split("=");
						if (pair.length == 2) {
							var property = pair[0];
							var action = pair[1];
							this.ConfigFilter[fileName][property] = action;
						}
					}
				} catch (exception) {
					filterPrefs.setCharPref(fileName,"");
				}
				
				ablist.appendChild(item);
			}
		}
		
		//
		// populate filter tree
		//
		var stringsBundleProp = document.getElementById("ThunderSyncPreferences.strings.dlg");
		var props = ThunderSyncVCardLib.baseProperties.concat(
				ThunderSyncVCardLib.otherProperties
		);
		props.push("Photo");
		var propName = "";
		var list = document.getElementById("ThunderSyncPreferences.treechildren.filter");
		for (i=0; i<props.length; i++) {
			try {
				propName = stringsBundleProp.getString(props[i]);
			} catch (exception) {
				propName = "<" + props[i] + ">";
			}
			var item = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treeitem"
			);
			item.setAttribute("class","ThunderSyncPreferences.treeitem.filter");
			
			var row = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treerow"
			);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			cell.setAttribute("crop","center");
			cell.setAttribute("label",propName);
			cell.setAttribute("value",props[i]);
			cell.setAttribute("class","ThunderSyncPreferences.treecell.filterProperty");
			row.appendChild(cell);
			
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			cell.setAttribute("crop","center");
			cell.setAttribute("label","ask");
			cell.setAttribute("value","ask");
			cell.setAttribute("class","ThunderSyncPreferences.treecell.filterAction");
			row.appendChild(cell);
			item.appendChild(row);
			list.appendChild(item);
		}
		
		try {
			this.aBook = document.getElementById("ThunderSyncPreferences.list.addressbook")
					.getItemAtIndex(0).getAttribute("value");
			document.getElementById("ThunderSyncPreferences.list.addressbook").selectedIndex = 0;
			document.getElementById("ThunderSyncPreferences.tree.filter").view.selection.select(0);
			this.updateExportFormat();
		} catch (exception) {
			// it seems there are no addressbooks: show alert and exit
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			var stringsBundle = document.getElementById("ThunderSyncPreferences.strings.prf");
			promptService.alert(
				null,
				stringsBundle.getString("titleError"),
				stringsBundle.getString("textErrorAddressbook")
			);
			window.close();
		}
	},
	
	/**
	 * 
	 */
	changeAddressbook: function (abItem) {
		//
		// load values of selected addressbook
		//
		
		this.aBook = abItem.value;
		
		var format          = this.ConfigFormat[abItem.value];
		var impEnc          = this.ConfigVCardImpEnc[abItem.value];
		var expEnc          = this.ConfigVCardExpEnc[abItem.value];
		var hideUID         = this.ConfigVCardUID[abItem.value];
		var quotedPrintable = this.ConfigVCardQuotedPrintable[abItem.value];
		var folding         = this.ConfigVCardFolding[abItem.value];
		var syncMode        = this.ConfigSyncMode[abItem.value];
		var syncStartUp     = this.ConfigStartUp[abItem.value];
		var syncShutDown    = this.ConfigShutDown[abItem.value];
		var filterList      = this.ConfigFilter[abItem.value];
		
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
		document.getElementById("ThunderSyncPreferences.grid.vCard")
			.setAttribute("hidden", format != "vCardDir" && format != "vCardFile" );
		
		switch (format) {
			case "vCardDir":
			case "vCardFile":
				//
				// set import encoding dropdown box to preference value
				//
				var list = document.getElementById("ThunderSyncPreferences.menulist.importEncoding");
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
				var list = document.getElementById("ThunderSyncPreferences.menulist.exportEncoding");
				var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.encoding");
				for (var i=0;i<items.length;i++) {
					if (items[i].value == expEnc) {
						list.selectedIndex = list.getIndexOfItem(items[i]);
						break;
					}
				}
				//
				// set UID as Note option
				//
				document.getElementById("ThunderSyncPreferences.checkbox.UID").checked = hideUID;
				//
				// set quoted-printable encoding option
				//
				document.getElementById("ThunderSyncPreferences.checkbox.quotedPrintable").checked = quotedPrintable;
				//
				// set line folding option
				//
				document.getElementById("ThunderSyncPreferences.checkbox.folding").checked = folding;
				break;
		}
		
		//
		// manage path popup menu depending on format
		//
		switch (format) {
			case "vCardDir":
				document.getElementById("ThunderSyncPreferences.button.chooseFile").hidden = true;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPMsg").hidden = true;
				document.getElementById("ThunderSyncPreferences.button.chooseDir").hidden = false;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPFolder").hidden = false;
				break;
			case "vCardFile":
				document.getElementById("ThunderSyncPreferences.button.chooseFile").hidden = false;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPMsg").hidden = false;
				document.getElementById("ThunderSyncPreferences.button.chooseDir").hidden = true;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPFolder").hidden = true;
				break;
		}
		
		//
		// set sync-on-start-up dropdown box to preference value
		//
		var list = document.getElementById("ThunderSyncPreferences.menulist.syncOnStartUp");
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
		
		//
		// update filter list
		//
		var stringsBundle = document.getElementById("ThunderSyncPreferences.strings.prf");
		var items = document.getElementsByClassName("ThunderSyncPreferences.treeitem.filter");
		for (i=0; i<items.length; i++) {
			var property = items[i].getElementsByClassName("ThunderSyncPreferences.treecell.filterProperty")[0]
						.getAttribute("value");
			var itemAction   = items[i].getElementsByClassName("ThunderSyncPreferences.treecell.filterAction")[0];
			if (filterList[property] && filterList[property] != itemAction.getAttribute("value")) {
				itemAction.setAttribute("value",filterList[property]);
				itemAction.setAttribute("label",stringsBundle.getString("filter"+filterList[property]));
			} else {
				itemAction.setAttribute("value","ask");
				itemAction.setAttribute("label",stringsBundle.getString("filterask"));
			}
		}
	},
	
	/**
	 * When user acknowledges changes (i.e. accepts dialog), all preferences get set
	 */
	accept: function () {
		//
		// access preferences system
		//
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService);
		
		var abPrefs              = prefs.getBranch("extensions.ThunderSync.Addressbooks.");
		var formatPrefs          = prefs.getBranch("extensions.ThunderSync.exportFormat.");
		var vCardExpPrefs        = prefs.getBranch("extensions.ThunderSync.vCard.exportEncoding.");
		var vCardImpPrefs        = prefs.getBranch("extensions.ThunderSync.vCard.importEncoding.");
		var vCardUID             = prefs.getBranch("extensions.ThunderSync.vCard.hideUID.");
		var vCardQuotedPrintable = prefs.getBranch("extensions.ThunderSync.vCard.quotedPrintable.");
		var vCardFolding         = prefs.getBranch("extensions.ThunderSync.vCard.folding.");
		var startUpPrefs         = prefs.getBranch("extensions.ThunderSync.startUp.");
		var shutDownPrefs        = prefs.getBranch("extensions.ThunderSync.shutdown.");
		var syncModePrefs        = prefs.getBranch("extensions.ThunderSync.syncMode.");
		var filterPrefs          = prefs.getBranch("extensions.ThunderSync.filter.");
		
		//
		// iterate over all fields of ConfigPath, i.e. over all addressbooks
		//
		for (var abName in this.ConfigPath) {
			abPrefs.setCharPref(abName,this.ConfigPath[abName]);
			formatPrefs.setCharPref(abName,this.ConfigFormat[abName]);
			
			vCardExpPrefs.setCharPref(abName,this.ConfigVCardExpEnc[abName]);
			vCardImpPrefs.setCharPref(abName,this.ConfigVCardImpEnc[abName]);
			
			vCardUID.setBoolPref(abName,this.ConfigVCardUID[abName]);
			vCardQuotedPrintable.setBoolPref(abName,this.ConfigVCardQuotedPrintable[abName]);
			vCardFolding.setBoolPref(abName,this.ConfigVCardFolding[abName]);
			
			startUpPrefs.setCharPref(abName,this.ConfigStartUp[abName]);
			shutDownPrefs.setCharPref(abName,this.ConfigShutDown[abName]);
			syncModePrefs.setCharPref(abName,this.ConfigSyncMode[abName]);
			
			// create filter list of name=value pairs
			var filters = "";
			for (var prop in this.ConfigFilter[abName]) {
				if (this.ConfigFilter[abName][prop] != "ask") {
					if (filters.length > 0) { filters += ","; }
					filters += prop + "=" + this.ConfigFilter[abName][prop];
				}
			}
			filterPrefs.setCharPref(abName,filters);
		}
		return true;
	},
	
	/**
	 * User changed the export format: show additional options
	 * (for now this apply for vCard only)
	 */
	updateExportFormat: function () {
		var oldformat = this.ConfigFormat[this.aBook];
		var format = document.getElementById("ThunderSyncPreferences.menulist.format")
			.selectedItem
			.getAttribute("value");
		
		// check if format has really changed; if not, just return
		if (format == oldformat) { return; }
		
		this.ConfigFormat[this.aBook] = format;
		document.getElementById("ThunderSyncPreferences.grid.vCard")
			.setAttribute("hidden", (format != "vCardDir") && (format != "vCardFile") );
		
		// manage path popup menu depending on format
		switch (format) {
			case "vCardDir":
				this.clearPath();
				document.getElementById("ThunderSyncPreferences.button.chooseFile").hidden = true;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPMsg").hidden = true;
				document.getElementById("ThunderSyncPreferences.button.chooseDir").hidden = false;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPFolder").hidden = false;
				break;
			case "vCardFile":
				this.clearPath();
				document.getElementById("ThunderSyncPreferences.button.chooseFile").hidden = false;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPMsg").hidden = false;
				document.getElementById("ThunderSyncPreferences.button.chooseDir").hidden = true;
// 				document.getElementById("ThunderSyncPreferences.button.chooseIMAPFolder").hidden = true;
				break;
		}
	},
	
	/**
	 *
	 */
	updateExportEncoding: function () {
		this.ConfigVCardExpEnc[this.aBook] = document
			.getElementById("ThunderSyncPreferences.menulist.exportEncoding")
			.selectedItem
			.getAttribute("value");
	},
	
	/**
	 *
	 */
	updateImportEncoding: function () {
		this.ConfigVCardImpEnc[this.aBook] = document
			.getElementById("ThunderSyncPreferences.menulist.importEncoding")
			.selectedItem
			.getAttribute("value");
	},
	
	/**
	 *
	 */
	updateSyncOnStartUp: function () {
		this.ConfigStartUp[this.aBook] = document
			.getElementById("ThunderSyncPreferences.menulist.syncOnStartUp")
			.selectedItem
			.getAttribute("value");
	},
	
	/**
	 *
	 */
	updateSyncMode: function () {
		this.ConfigSyncMode[this.aBook] = document
			.getElementById("ThunderSyncPreferences.menulist.syncMode")
			.selectedItem
			.getAttribute("value");
	},
	
	/**
	 *
	 */
	updateSyncOnShutdown: function () {
		this.ConfigShutDown[this.aBook] = document
			.getElementById("ThunderSyncPreferences.menulist.syncOnShutdown")
			.selectedItem
			.getAttribute("value");
	},
	
	/**
	 * User wants to delete the path of an addressbook he selected: do it
	 */
	clearPath: function () {
/*
		var row = document.getElementById("ThunderSyncPreferences.list.addressbook")
			.getSelectedItem(0);
		var path = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookpath")[0];
		var name = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookname")[0];
		row.removeAttribute("tooltiptext");
		path.setAttribute("label","");
*/
		this.ConfigPath[this.aBook] = "";
		document.getElementById("ThunderSyncPreferences.edit.path").value = ""
	},
	
	/**
	 * Let the user choose a file and set it as path of the current addressbook
	 */
	openFileDialog: function () {
		this.openPathDialog(Components.interfaces.nsIFilePicker.modeOpen);
	},
	
	/**
	 * Let the user choose a directory and set it as path of the current addressbook
	 */
	openDirDialog: function () {
		this.openPathDialog(Components.interfaces.nsIFilePicker.modeGetFolder);
	},
	
	/**
	 * Open a file picker dialog and set path of addressbook in the dialog's list.
	 * 
	 * @param mode file picker mode, either nsIFilePicker.modeSave or nsIFilePicker.modeGetFolder
	 */
	openPathDialog: function (mode) {
		// create and execute file selection dialog
		var stringsBundle = document.getElementById("ThunderSyncPreferences.strings.prf");
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
				.createInstance(nsIFilePicker);
		
		if (this.ConfigPath[this.aBook].substr(0,7) == "file://") {
			try {
				var curFile = Components.classes["@mozilla.org/network/io-service;1"]
						.getService(Components.interfaces.nsIIOService)
						.newURI(this.ConfigPath[this.aBook],null,null)
						.QueryInterface(Components.interfaces.nsIFileURL)
						.file;
				fp.displayDirectory = curFile.parent;
				fp.defaultString = curFile.leafName;
			} catch (exception) {}
		} else {
			if (this.ConfigPath[this.aBook].length > 0) {
				var curFile = Components.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);
				try {
					curFile.initWithPath(this.ConfigPath[this.aBook]);
					fp.displayDirectory = curFile.parent;
					fp.defaultString = curFile.leafName;
				} catch (exception) {}
			}
		}
		
		// add filter depending on user-defined format
		// this will be the default filter
		switch (this.ConfigFormat[this.aBook]) {
			case "vCardFile":
				fp.appendFilter(stringsBundle.getString("filterVCard"),"*.vcf");
				break;
		}
		// add *.* to the filter list, as a backup
		fp.appendFilters(nsIFilePicker.filterAll);
		
		// try to open file picker, catch any exceptions
		try {
			fp.init(
				window,
				stringsBundle.getString((mode == nsIFilePicker.modeGetFolder) ? "titleDirPicker" : "titleFilePicker" ),
				mode
			);
			var rv = fp.show();
		} catch (exception) {
			var rv = null;
		}
		
		// process selected path if file selection dialog returned with success
		// returnOK: user selected an existing file/dir
		// returnReplace: user acknowledged overwriting an existing file
		if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
			// check all addressbooks in dialog for path collisions
			var doublette = false;
			for (var abName in this.ConfigPath) {
				if (abName != this.aBook && this.ConfigPath[abName] == fp.fileURL.spec) {
					doublette = true;
					break;
				}
			}
			if (!doublette) {
				// path seems to be unique with regard to addressbooks
				this.ConfigPath[this.aBook] = fp.fileURL.spec;
				// set path to preference string value
				document.getElementById("ThunderSyncPreferences.edit.path").value = fp.fileURL.spec;
			}
			else {
				// path already assigned to another addressbook:
				// show an error message
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
				promptService.alert(
					null,
					stringsBundle.getString("titleError"),
					stringsBundle.getString("textErrorPath")
				);
			}
		}
	},
	
	/**
	 * 
	 */
	openIMAPMsgDialog: function () {
		this.openIMAPDialog(true);
	},
	
	/**
	 * 
	 */
	openIMAPFolderDialog: function () {
		this.openIMAPDialog(false);
	},
	
	/**
	 * Let the user choose an IMP folder and set it as path of the current addressbook
	 * https://developer.mozilla.org/index.php?title=en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/Open_Folder&action=diff&revision=25&diff=26
	 * 
	 * @param selectMsg boolean, choose individual message (true) or folder (false)?
	 */
	openIMAPDialog: function (selectMsg) {
		// first step: obtain selected addressbook and check path
		var curPath = this.ConfigPath[this.aBook];
		if (curPath.substr(0,15) == "imap-message://") {
			// if path is alread set to an imap resource,
			// pass it on to the dialog's parameters
			var parameters = { input:curPath, selectMsg:selectMsg, output:null };
		} else {
			var parameters = { input:null,    selectMsg:selectMsg, output:null };
		}
		
		try {
			// call dialog
			var dialog = window.openDialog(
					'chrome://thundersync/content/ThunderSyncPreferencesIMAP.xul',
					'',
					'chrome,centerscreen,modal,alwaysRaised,dialog',
					parameters
			);
			if (parameters.output) {
				// if there is something in the output variable:
				// dialog was accepted by user
				//
				// set config variable
				this.ConfigPath[this.aBook] = parameters.output;
				// set path to preference string value
				document.getElementById("ThunderSyncPreferences.edit.path").value = parameters.output;
			}
		} catch (exception) {
			// something went wrong, log to error console
			Components.classes["@mozilla.org/consoleservice;1"]
				.getService(Components.interfaces.nsIConsoleService)
				.logStringMessage("ThunderSync/IMAP Options: "+exception);
		}
	},
	
	/**
	 * 
	 */
	optionUID: function () {
		this.ConfigVCardUID[this.aBook] = document
			.getElementById("ThunderSyncPreferences.checkbox.UID")
			.checked;
	},
	
	/**
	 * 
	 */
	optionQuotedPrintable: function () {
		this.ConfigVCardQuotedPrintable[this.aBook] = document
			.getElementById("ThunderSyncPreferences.checkbox.quotedPrintable")
			.checked;
	},
	
	/**
	 * 
	 */
	optionFolding: function () {
		this.ConfigVCardFolding[this.aBook] = document
			.getElementById("ThunderSyncPreferences.checkbox.folding")
			.checked;
	},
	
	/**
	 * set filter rule for selected property to the given action.
	 * 
	 * @param action name of the action
	 */
	setFilter: function (action) {
		if (action == "ignore" || action == "export" || action == "import" || action == "ask") {
			// multiple selected tree elements is a bit tricky
			var tree = document.getElementById("ThunderSyncPreferences.tree.filter");
			var items = new Array();
			var start = new Object();
			var end = new Object();
			var numRanges = tree.view.selection.getRangeCount();
			for (var n = 0; n<numRanges; n++) {
				tree.view.selection.getRangeAt(n,start,end);
				for (var i=start.value; i<=end.value; i++) {
					items.push(tree.view.getItemAtIndex(i))
				}
			}
			
			for (i=0; i<items.length; i++) {
				var itemAction = items[i].getElementsByClassName("ThunderSyncPreferences.treecell.filterAction")[0];
				var property = items[i].getElementsByClassName("ThunderSyncPreferences.treecell.filterProperty")[0]
						.getAttribute("value");
				itemAction.setAttribute("value",action);
				itemAction.setAttribute("label",document.getElementById("ThunderSyncPreferences.strings.prf").getString("filter"+action));
				this.ConfigFilter[this.aBook][property] = action;
			}
		}
	},
	
	/**
	 * Clean up photo directory.
	 * 
	 * Iterates over all contacts in all addressbooks and looks for
	 * locally stored photo files. Deletes all files not connected to any
	 * contact.
	 */
	cleanUpPhotoDir: function () {
		// first: collect all photo files
		var fileList = new Array();
		var photoDir = Components
				.classes["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("ProfD", Components.interfaces.nsIFile);
		var photoDirPath = photoDir.path;
		photoDir.append("Photos");
		if (photoDir.exists() && photoDir.isDirectory()) {
			var files = photoDir.directoryEntries;
			while (files.hasMoreElements()) {
				// get next item in list; skip if it's not a file object
				var file = files.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				if (file.isFile()) { fileList.push(file.leafName); }
			}
		} else {
			// no photo directory: return from function
			return;
		}
		
		// second: iterate over all contacs and
		// remove their photo filenames from the file list created above.
		var abManager = Components.classes["@mozilla.org/abmanager;1"]
				.getService(Components.interfaces.nsIAbManager);
		var allAddressBooks = abManager.directories;
		var ablist = document.getElementById("ThunderSyncPreferences.list.addressbook");
		while (allAddressBooks.hasMoreElements()) {
			var addressBook = allAddressBooks.getNext();
			if (addressBook instanceof Components.interfaces.nsIAbDirectory)
			{
				var cards = addressBook.childCards;
				while (cards.hasMoreElements()) {
					var card = cards.getNext();
					if (card instanceof Components.interfaces.nsIAbCard) {
						if (card.getProperty("PhotoType","") == "file") {
							var index = fileList.indexOf(card.getProperty("PhotoName",""));
							if (index >= 0) {
								var fileList = fileList
									.slice(0,index)
									.concat(fileList.slice(index+1));
							}
							
						}
					}
				}
			}
		}
		
		// finally: delete all files still in list
		// prior to this: ask user if he really wants to do it.
		var stringsBundle = document.getElementById("ThunderSyncPreferences.strings.prf");
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		if (fileList.length > 0) {
			var answer = promptService.confirm(null,
				stringsBundle.getString("titleCleanFoto"),
				stringsBundle.getFormattedString("textCleanFoto",[photoDirPath])
			);
			if (answer) {
				for (var i=0; i<fileList.length; i++) {
					var photoFile = photoDir.clone();
					photoFile.append(fileList[i]);
					photoFile.remove(false);
				}
			}
		} else {
			promptService.alert(null,
				stringsBundle.getString("titleCleanFoto"),
				stringsBundle.getFormattedString("textNoCleanFoto",[photoDirPath])
			);
		}
	}
}

