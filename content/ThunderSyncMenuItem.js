/**
 * Addressbook context menu logic for ThunderSync
 * Copyright (C) 2013 Frank Abelbeck <frank.abelbeck@googlemail.com>
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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var ThunderSyncMenuItem = {
	
	/**
	 * Checks given addressbook directory if it is properly configured, i.e.
	 * if it can be synchronised at all.
	 *
	 * @param addressbook directory to check (nsIAbDirectory)
	 * @return true if directory can be synchronised, false otherwise (bool)
	 */
	isSyncableAddressbook: function (addressbook) {
		var retval = false;
		try {
			if (Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.")
				.getCharPref(addressbook.fileName.replace(".mab",""))
				.length > 0) { retval = true; }
		} catch (exception) {}
		return retval;
	},
	
	checkDirTreeContext: function () {
		var menuitemSync   = document.getElementById("ThunderSyncMenuItem.DirContextMenuItem");
		var menuitemExport = document.getElementById("ThunderSyncMenuItem.DirContextMenuItemExport");
		var menuitemImport = document.getElementById("ThunderSyncMenuItem.DirContextMenuItemImport");
		// check if selected addressbook is not a mailing list
		var directoryURI = GetSelectedDirectory();
		var directory = GetDirectoryFromURI(directoryURI);
		if (directory.isMailList || !this.isSyncableAddressbook(directory)) {
			// selected addressbook is a mailing list: no sync op possible, for now...
			menuitemSync.setAttribute("disabled","true");
			menuitemExport.setAttribute("disabled","true");
			menuitemImport.setAttribute("disabled","true");
		} else {
			// selected addressbook is a normal addressbook, enable menu
			menuitemSync.setAttribute("disabled","false");
			menuitemExport.setAttribute("disabled","false");
			menuitemImport.setAttribute("disabled","false");
		}
	},
	
	checkContactTreeContext: function () {
		// disable popup menu
		var menuitemSync   = document.getElementById("ThunderSyncMenuItem.CardContextMenuItem");
		var menuitemExport = document.getElementById("ThunderSyncMenuItem.CardContextMenuItemExport");
		var menuitemImport = document.getElementById("ThunderSyncMenuItem.CardContextMenuItemImport");
		menuitemSync.setAttribute("disabled","true");
		menuitemExport.setAttribute("disabled","true");
		menuitemImport.setAttribute("disabled","true");
		
		var cards = GetSelectedAbCards();
		var directoryURI = GetSelectedDirectory();
		var directory = GetDirectoryFromURI(directoryURI);
		
		// apply correct localised string (singular/plural depending on number of selected cards)
		var stringsBundle = document.getElementById("ThunderSyncMenuItem.strings.menu");
		if (cards.length == 1) {
			menuitemSync.setAttribute("label",stringsBundle.getString("SyncThisContact"));
			menuitemExport.setAttribute("label",stringsBundle.getString("ExportThisContact"));
			menuitemImport.setAttribute("label",stringsBundle.getString("ImportThisContact"));
		} else {
			menuitemSync.setAttribute("label",stringsBundle.getString("SyncTheseContacts"));
			menuitemExport.setAttribute("label",stringsBundle.getString("ExportTheseContacts"));
			menuitemImport.setAttribute("label",stringsBundle.getString("ImportTheseContacts"));
		}
		
		// only enable menu if selected directory is properly configured...
		if (this.isSyncableAddressbook(directory)) {
			// check if at least one of the selected cards is not a mailing list
			for (var i=0; i<cards.length; i++) {
				var card = cards[i];
				card.QueryInterface(Components.interfaces.nsIAbCard);
				if (!card.isMailList) {
					// ok, at least one selected contact is not a mailing list,
					// thus shohpopup menu and quit this loop...
					menuitemSync.setAttribute("disabled","false");
					menuitemExport.setAttribute("disabled","false");
					menuitemImport.setAttribute("disabled","false");
					break;
				}
			}
		}
	},
	
	/**
	 * Calls ThunderSyncDialog's compare() function.
	 * 
	 * This is a wrapper for certain special operations like import/export
	 * some cards or only a certain directory.
	 *
	 * @param cmd command to execute ('export','import','dirSync','dirExport',
	 *            'dirImport','cardSync','cardExport','cardImport')
	 */
	callCompare: function (cmd) {
		var arguments = new Object();
		arguments.mode = cmd;
		
		if (cmd != "export" && cmd != "import") {
			// a single directory is selected: construct pseudo enumerator for the sync algorithm
			var directories = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			directories.appendElement(GetDirectoryFromURI(GetSelectedDirectory()),false);
			arguments.directories = directories.enumerate();
		}
		
		if (cmd == "cardSync" || cmd == "cardExport" || cmd == "cardImport") {
			// some contacts are selected: construct card enumerator for the sync algorithm
			var cards = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			var selectedCards = GetSelectedAbCards();
			for (var i = 0; i < selectedCards.length; i++) {
				var card = selectedCards[i];
				card.QueryInterface(Components.interfaces.nsIAbCard);
				cards.appendElement(card,false);
			}
			arguments.cards = cards.enumerate();
		}
		
		arguments.wrappedJSObject = arguments;
		window.openDialog('chrome://thundersync/content/ThunderSyncDialog.xul','','chrome,centerscreen',arguments);
	},
	
	/**
	 * Calls ThunderSync's preferences dialog.
	 * 
	 * This is a wrapper which makes sure the selected directory is indeed
	 * selected in the preferences dialog...
	 */
	callPreferences: function () {
		var arguments = new Object();
		arguments.selectedURI = GetSelectedDirectory();
		arguments.wrappedJSObject = arguments;
		window.openDialog('chrome://thundersync/content/ThunderSyncPreferences.xul','','chrome,centerscreen',arguments);
	},
	
	/**
	 * Write a message to Thunderbird's error console
	 * 
	 * @param msg message string
	 */
	logMsg: function (msg) {
		Components.classes["@mozilla.org/consoleservice;1"]
			.getService(Components.interfaces.nsIConsoleService)
			.logStringMessage("[ThunderSync/ContextMenu] "+msg);
	},
}
