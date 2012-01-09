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

Components.utils.import("resource://app/modules/gloda/public.js");
Components.utils.import("resource:///modules/gloda/mimemsg.js");

var ThunderSyncPrefIMAP = {
// ThunderSync/GlodaMessage: _id,_folderID,_messageKey,_conversationID,_conversation,_date,
// 			_headerMessageID,_jsonText,_notability,_subject,_indexedBodyText,
// 			_attachmentNames,from,to,cc,bcc,attachmentInfos,starred,read,repliedTo,
// 			forwarded,tags,involves,recipients,toMe,fromMe,_lruPrev,_lruNext,NOUN_ID,
// 			_datastore,id,folderID,messageKey,conversationID,headerMessageID,notability,
// 			subject,indexedBodyText,attachmentNames,date,folder,folderURI,
// 			conversation,toString,_clone,_declone,_ghost,_isGhost,_ensureNotDeleted,
// 			_isDeleted,_objectPurgedMakeYourselfUnpleasant,folderMessage,
// 			folderMessageURI,enumerateAttributes,domContribute,NOUN_DEF,
	
	glodaListener: {
		isReady: false,
		
		formatDate: function (date) {
			var Y = date.getFullYear().toString();
			var M = (date.getMonth() + 1).toString();
			var D = date.getDate().toString();
			var h = date.getHours().toString();
			var m = date.getMinutes().toString();
			
			if (M.length == 1) { M = "0" + M; }
			if (D.length == 1) { D = "0" + D; }
			if (h.length == 1) { h = "0" + h; }
			if (m.length == 1) { m = "0" + m; }
			
			return Y+"-"+M+"-"+D+" "+h+":"+m; 
		},
		formatSize: function (byteSize) {
			var unit = [" B", " kiB"," MiB"," GiB"," TiB"];
			var precision = 0;
			while (byteSize > 1536) {
				byteSize /= 1024;
				unit.shift();
				precision = 1;
			}
			return byteSize.toFixed(precision) + unit[0];
		},
		onItemsAdded: function (aItems, aCollection) {},
		onItemsModified: function (aItems, aCollection) {},
		onItemsRemoved: function (aItems, aCollection) {},
		mimeMsgCallback: function (msgHdr, mimeMsg) {
		},
		onQueryCompleted: function (aCollection) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
						.getService(Components.interfaces.nsIConsoleService);
			var messenger = Components.classes["@mozilla.org/messenger;1"]  
						.createInstance(Components.interfaces.nsIMessenger);
			var list = document.getElementById("ThunderSyncPreferences.IMAP.list");
			
			var defaultIndex = -1;
			this.listItems = aCollection.items;
			for (i=0; i<this.listItems.length; i++) {
				//
				// https://developer.mozilla.org/en/NsIMsgDBHdr
				// https://developer.mozilla.org/en/nsIMsgFolder
				// https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/View_Message
				//
				// extract folder object and construct full path
				var messageURI = this.listItems[i].folderMessageURI;
				var messageHdr = messenger.messageServiceFromURI(messageURI)
						.messageURIToMsgHdr(messageURI);
				var folder = messageHdr.folder;
				var path = new Array();
				while (folder) {
					path.unshift(folder.prettyName);
					folder = folder.parent;
				}
				var path = path.join(" / ");
				if (messageURI == this.defaultURI) { defaultIndex = i+1; }
				
				// construct list item
				var item = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listitem"
				);
				item.setAttribute("class","ThunderSyncPreferences.IMAP.listitem");
 				item.setAttribute("value",messageURI);
				
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listcell"
				);
				cell.setAttribute("class","ThunderSyncPreferences.IMAP.listcell.path");
				cell.setAttribute("label",path);
				cell.setAttribute("tooltiptext",path);
				item.appendChild(cell);
				
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"listcell"
				);
				cell.setAttribute("class","ThunderSyncPreferences.IMAP.listcell.subject");
				cell.setAttribute("label",this.listItems[i].subject);
				cell.setAttribute("tooltiptext",this.listItems[i].subject);
				item.appendChild(cell);
				
				list.appendChild(item);
			}
			list.setAttribute("hidden",false);
			window.sizeToContent();
			list.selectedIndex = defaultIndex;
			try { list.ensureIndexIsVisible(defaultIndex); } catch (ex) {}
			document.documentElement.getButton("accept").disabled = true;
			this.isReady = true;
		},
		
		setDefaultURI: function (input) {
			try {
				this.defaultURI = input;
			} catch (exception) {
				this.defaultURI = null;
			}
		},
		
		getElement: function (idx) {
			if (this.isReady) {
				try {
					if (idx == null) {
						idx = document.getElementById("ThunderSyncPreferences.IMAP.list")
							.selectedIndex
					}
					result = this.listItems[idx];
				} catch (exception) {
					var result = "";
				}
			} else {
				var result = null;
			}
			return result;
		}
	},
	
	//
	// Refer to:
	//    https://developer.mozilla.org/en/Thunderbird/Account_examples
	//    https://developer.mozilla.org/en/Thunderbird/Creating_a_Gloda_message_query
	//    https://developer.mozilla.org/en/Thunderbird/Gloda_examples
	//
	load: function () {
		var query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
		query.attachmentNamesMatch(".vcf");
		this.glodaListener.setDefaultURI(window.arguments[0].input);
		var collection = query.getCollection(this.glodaListener);
	},
	
	accept: function () {
		var result = this.glodaListener.getElement().folderMessageURI;
		if (result) {
			window.arguments[0].output = result;
			return true;
		} else {
			return false;
		}
	},
	
	selectItem: function (list) {
		var i = list.selectedIndex;
		if (i >= 0) {
			document.documentElement.getButton("accept").disabled = false;
		}
		var item = this.glodaListener.getElement(i);
		if (item) {
			var msgtxt = "";
			for (i=0; i<item.attachmentNames.length; i++) {
				msgtxt += item.attachmentNames[i] + " (" + item.attachmentTypes[i] + ")\n";
			}
			document.getElementById("ThunderSyncPreferences.IMAP.details").value = msgtxt;
		}
	}		
}
