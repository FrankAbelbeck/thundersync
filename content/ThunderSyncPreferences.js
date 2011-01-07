/**
 * Preferences logic for ThunderSync.
 * Copyright (C) 2010 Frank Abelbeck <frank.abelbeck@googlemail.com>
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
 * @author Frank Abelbeck
 * @version 2010-12-19 (1.1)
 */

var ThunderSyncPref = {
	load: function () {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.ThunderSync.Addressbooks.");
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var allAddressBooks = abManager.directories;
		var ablist = document.getElementById("ThunderSyncPreferences.list.addressbook");
		while (allAddressBooks.hasMoreElements()) {
			var addressBook = allAddressBooks.getNext();
			if (addressBook instanceof Components.interfaces.nsIAbDirectory)
			{
				var fileName = addressBook.fileName.replace(".mab","");
				var row = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listitem"
				);
				row.setAttribute("context","ThunderSyncPreferences.popup.addressbook");
				
				var item = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listcell"
				);
				item.setAttribute("crop","end");
				item.setAttribute("label",addressBook.dirName);
				item.setAttribute("class","ThunderSyncPreferences.cell.addressbookname");
				row.appendChild(item);
				
				var item = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listcell"
				);
 				try {
					var addrpathstr = prefs.getCharPref(fileName);
					
					var addrpath = Components
						.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);  
					addrpath.initWithPath(addrpathstr);
					if (addrpath.isDirectory()) {
						item.setAttribute("label",addrpathstr);
						row.setAttribute(
							"tooltiptext",
							addressBook.dirName + ": " + addrpathstr
						);
					}
				}
				catch (exception) {
					prefs.setCharPref(fileName,"");
					item.setAttribute("label", "");
				}
				item.setAttribute("crop","end");
				item.setAttribute("class","ThunderSyncPreferences.cell.addressbookpath");
				item.setAttribute("value",fileName);
				row.appendChild(item);
				ablist.appendChild(row);
			}
		}
		
		var format = "";
		try {
			format = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.getCharPref("exportFormat");
		}
		catch (exception) {
			Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.setCharPref("exportFormat","vcard");
			format = "vcard";
		}
		
		if (format == "vcard") {
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
		
		var list = document.getElementById("ThunderSyncPreferences.menulist.format");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.format");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == format) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
		
		var encoding = "";
		try {
			encoding = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.getCharPref("importEncoding");
		}
		catch (exception) {
			Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.setCharPref("importEncoding","Standard");
			encoding = "Standard";
		}
		var list = document.getElementById("ThunderSyncPreferences.menulist.importencoding");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.encoding");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == encoding) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
		
		var encoding = "";
		try {
			encoding = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.getCharPref("exportEncoding");
		}
		catch (exception) {
			Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.setCharPref("exportEncoding","UTF-8");
			encoding = "UTF-8";
		}
		var list = document.getElementById("ThunderSyncPreferences.menulist.exportencoding");
		var items = list.getElementsByClassName("ThunderSyncPreferences.menuitem.encoding");
		for (var i=0;i<items.length;i++) {
			if (items[i].value == encoding) {
				list.selectedIndex = list.getIndexOfItem(items[i]);
				break;
			}
		}
	},
	
	accept: function () {
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
		Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.ThunderSync.")
			.setCharPref("exportFormat",
				document.getElementById("ThunderSyncPreferences.menulist.format")
				.selectedItem.value);
		Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.ThunderSync.")
			.setCharPref("exportEncoding",
				document.getElementById("ThunderSyncPreferences.menulist.exportencoding")
				.selectedItem.value);
		Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.ThunderSync.")
			.setCharPref("importEncoding",
				document.getElementById("ThunderSyncPreferences.menulist.importencoding")
				.selectedItem.value);
		return true;
	},
	
	clearPath: function () {
		var row = document.getElementById("ThunderSyncPreferences.list.addressbook")
			.getSelectedItem(0);
		var path = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookpath")[0];
		var name = row.getElementsByClassName("ThunderSyncPreferences.cell.addressbookname")[0];
		row.removeAttribute("tooltiptext");
		path.setAttribute("label","");
	},
	
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
	
	openPathDialog: function () {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
		fp.init(window, "Dialog Title", nsIFilePicker.modeGetFolder);
		var rv = fp.show();
		if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
			var paths = document
				.getElementById("ThunderSyncPreferences.list.addressbook")
				.getElementsByClassName("ThunderSyncPreferences.cell.addressbook");
			var doublette = false;
			for (var i = 0; i < paths.length; i++) {
				if (paths[i].getAttribute("label") == fp.file.path) {
					doublette = true;
					break;
				}
			}
			if (!doublette) {
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
	}
	
}

