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

var ThunderSyncPrefIMAP = {
// 	consoleService: Components.classes["@mozilla.org/consoleservice;1"]
// 				.getService(Components.interfaces.nsIConsoleService),
	
	maxRecursionLevel: 32,
	
	glodaListener: {
		updateProgressMeter: function () {
			var progressMeter = document.getElementById("ThunderSyncPreferences.IMAP.progress");
			progressMeter.setAttribute("value",(Number(progressMeter.getAttribute("value"))+10)%100);
		},
		onItemsAdded: function (aItems, aCollection) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
						.getService(Components.interfaces.nsIConsoleService);
			for (i=0; i<aItems.length; i++) {
				consoleService.logStringMessage(
					"ThunderSync/IMAP Options: " +
					aItems[i].subject + ", " +  aItems[i].date
				);
			}
			this.updateProgressMeter();
		},
		onItemsModified: function (aItems, aCollection) {
			this.updateProgressMeter();
		},
		onItemsRemoved: function (aItems, aCollection) {
			this.updateProgressMeter();
		},
		onQueryCompleted: function (aCollection) {
			var textbox = document.getElementById("ThunderSyncPreferences.IMAP.progresstext");
			var text = textbox.getAttribute("value");
			textbox.setAttribute("value",text + "\n" + "done");
			
// 			document.getElementById("ThunderSyncPreferences.IMAP.progress").setAttribute("hidden","true");
// 			document.getElementById("ThunderSyncPreferences.IMAP.progresslabel").setAttribute("hidden","true");
			document.getElementById("ThunderSyncPreferences.IMAP.tree").setAttribute("hidden","false");
		}
	},
	
	//
	// Refer to:
	//    https://developer.mozilla.org/en/Thunderbird/Account_examples
	//    https://developer.mozilla.org/en/Thunderbird/Creating_a_Gloda_message_query
	//    https://developer.mozilla.org/en/Thunderbird/Gloda_examples
	//
	load: function () {
		Components.utils.import("resource://app/modules/gloda/public.js");
		
		var query = Gloda.newQuery(Gloda.NOUN_CONVERSATION);
		query.subjectMatches("ThunderSync 2 Addressbook Resource");
// 		query.attachmentTypes("text/v-card");
		var collection = query.getCollection(this.glodaListener); 
/*
		
		var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
					.getService(Components.interfaces.nsIMsgAccountManager);
		var accounts = accountManager.accounts;
		var IMAPtree = document.getElementById("ThunderSyncPreferences.IMAP.treechildren")
		
		for (var i = 0; i < accounts.Count(); i++) {
			var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
			var rootFolder = account.incomingServer.rootFolder;
			
			if (account.incomingServer.type == "imap" &&
				account.incomingServer.canCreateFoldersOnServer &&
				account.incomingServer.canFileMessagesOnServer) {
				
				accountItem = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treeitem"
				);
				accountItem.setAttribute("class","ThunderSyncPreferences.IMAP.account.treeitem");
				
				var row = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treerow"
				);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",rootFolder.prettyName);
				cell.setAttribute("class","ThunderSyncPreferences.IMAP.account.treecell");
				cell.setAttribute("URI",rootFolder.URI);
				cell.setAttribute("crop","center");
				
				row.appendChild(cell);
				accountItem.appendChild(row);
				
				if (rootFolder.hasSubFolders) {
					accountItem.setAttribute("container","true");
					accountItem.setAttribute("open","true");
					accountItem.appendChild(
						this.createSubFolderItem(
							rootFolder.subFolders,
							0
						)
					);
				} else {
					accountItem.setAttribute("container","false");
					accountItem.setAttribute("open","false");
				}
				
				IMAPtree.appendChild(accountItem);
			}
		}
		
		//
		// Todo: for each folder, search for messages with...
		// ...subject "ThunderSync2"
		// ...body text "IMAP resource for ThunderSync 2"
		// ...attachment mime type "text/v-card" in case of format=vcard
		//
		
		document.getElementById("ThunderSyncPreferences.IMAP.tree").view.selection.select(0);
*/
	},
	
	/**
	 * Recursive function to fill the account/folder tree view.
	 * 
	 * Each of the given folders will be checked.
	 * If a folder contains folders, this function will be called with
	 * these subfolders as parameter.
	 * 
	 * Parameter recursionLevel represents a safety catch and stops at a
	 * recursion depth of 32. This can be modified with constant
	 * this.maxRecursionLevel...
	 * 
	 * @param subFolders iterator pointing to some folders
	 * @param recursionLevel integer denoting level of recursion
	 */
	createSubFolderItem: function (subFolders,recursionLevel) {
		var subFolderItem = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treechildren"
		);
		while (subFolders.hasMoreElements()) {
			var folder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
			var folderItem = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treeitem"
			);
			if (folder.canFileMessages) {
				folderItem.setAttribute("class","ThunderSyncPreferences.IMAP.folder.treeitem");
			} else {
				folderItem.setAttribute("class","ThunderSyncPreferences.IMAP.virtualFolder.treeitem");
			}
			
			var row = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treerow"
			);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			cell.setAttribute("label",folder.prettyName);
			cell.setAttribute("class","ThunderSyncPreferences.IMAP.folder.treecell");
			cell.setAttribute("URI",folder.URI);
			cell.setAttribute("crop","center");
			
			row.appendChild(cell);
			folderItem.appendChild(row);
			
			if (folder.hasSubFolders && recursionLevel < this.maxRecursionLevel) {
				folderItem.setAttribute("container","true");
				folderItem.setAttribute("open","true");
				folderItem.appendChild(
					this.createSubFolderItem(
						folder.subFolders,
						recursionLevel+1
					)
				);
			} else {
				folderItem.setAttribute("container","false");
				folderItem.setAttribute("open","false");
			}
			
			subFolderItem.appendChild(folderItem);
		}
		return subFolderItem;
	},
	
	accept: function () {
		return true
	},
	
	folderSelect: function () {
		var tree = document.getElementById("ThunderSyncPreferences.IMAP.tree");
		var list = document.getElementById("ThunderSyncPreferences.IMAP.list");
		var text = document.getElementById("ThunderSyncPreferences.IMAP.text");
		
		var selectedItem = tree.view.getItemAtIndex(tree.currentIndex);
		if (selectedItem.getAttribute("class") != "ThunderSyncPreferences.IMAP.folder.treeitem") {
			selectedItem = null;
		}
		
		this.clearList();
		if (selectedItem == null) {
			list.setAttribute("hidden","true");
			text.setAttribute("hidden","false");
			text.setAttribute("value",document.getElementById("string-bundle").getString("noMsgFound"));
		} else {
			list.setAttribute("hidden","false");
			text.setAttribute("hidden","true");
		}
	},
	
	clearList: function () {
		var list = document.getElementById("ThunderSyncPreferences.IMAP.list");
		while (list.itemCount > 0) {list.removeItemAt(0); };
	},
	
	addListItem: function (subject,from,date,attachment) {
		if (!subject)    { subject    = ""; }
		if (!from)       { from       = ""; }
		if (!date)       { date       = ""; }
		if (!attachment) { attachment = ""; }
		
		var item = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"listitem"
		);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"listcell"
		);
		cell.setAttribute("class","ThunderSyncPreferences.IMAP.listitem.subject");
		cell.setAttribute("crop","end");
		cell.setAttribute("label",subject);
		item.appendChild(cell);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"listcell"
		);
		cell.setAttribute("class","ThunderSyncPreferences.IMAP.listitem.from");
		cell.setAttribute("crop","end");
		cell.setAttribute("label",from);
		item.appendChild(cell);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"listcell"
		);
		cell.setAttribute("class","ThunderSyncPreferences.IMAP.listitem.date");
		cell.setAttribute("crop","end");
		cell.setAttribute("label",date);
		item.appendChild(cell);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"listcell"
		);
		cell.setAttribute("class","ThunderSyncPreferences.IMAP.listitem.attachment");
		cell.setAttribute("crop","end");
		cell.setAttribute("label",attachment);
		item.appendChild(cell);
		
		document.getElementById("ThunderSyncPreferences.IMAP.list").appendChild(item);
	},
	
// 	logMsg: function (msg) {
// 		this.consoleService.logStringMessage("ThunderSync/IMAP: "+msg);
// 	}
}
