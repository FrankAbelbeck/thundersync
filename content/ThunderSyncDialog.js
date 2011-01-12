/**
 * Main dialog logic for ThunderSync
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

var ThunderSyncDialog = {
	
	/*
		Unicode symbols for column "mode"
	*/
	modeFromLocal:    ">>",
	modeFromRemote:   "<<",
	modeUnequal:      "!=",
	modeExchange:     "<>",
	
	/**
	 * Compares to string values and returns a mode character:
	 *   value1 != "" && value2 != "": this.modeUnequal
	 *   value1 == "" && value2 != "": this.modeFromRemote
	 *   value1 != "" && value2 == "": this.modeFromLocal
	 *
	 * @param value1 first string value
	 * @param value2 second string value
	 * @return mode character
	 */
	getMode: function (value1,value2) {
		if ((value1 != "") && (value2 != "")) { return this.modeUnequal; }
		if ((value1 == "") && (value2 != "")) { return this.modeFromRemote; };
		if ((value1 != "") && (value2 == "")) { return this.modeFromLocal; };
		return null;
	},
	
	/**
	 * Checks given tree contact property item (if attributes container="true" and
	 * class="ThunderSyncDialog.treeitem.contact") for modes of its child
	 * rows.
	 *
	 * If all rows show the same mode:
	 *   set same mode for contact item.
	 * If at least one row differs or modeUnequal is present:
	 *   set mode of contact item to modeUnequal.
	 *
	 * @param item contact treeitem node
	 */
	checkTreeContactItem: function (item) {
		if (item.getAttribute("class") != "ThunderSyncDialog.treeitem.contact"
			|| item.getAttribute("container") != "true") { return; }
		
		var itemmode = item.getElementsByClassName("ThunderSyncDialog.treecell.mode")[0];
		var modeitems = item.getElementsByClassName("ThunderSyncDialog.treecell.property.mode");
		
		var mode = this.modeExchange;
		var tmpmode = "";
		for (var i = 0; i < modeitems.length; i++) {
			tmpmode = modeitems[i].getAttribute("label");
			if (tmpmode == this.modeUnequal) {
				mode = this.modeUnequal;
				break;
			}
		}
		itemmode.setAttribute("label",mode);
	},
	
	/**
	 * Clear tree widget by removing all child nodes.
	 */
	clearTree: function () {
		var tree = document.getElementById("ThunderSyncDialog.treechildren")
		while (tree.hasChildNodes()) {
			tree.removeChild(tree.firstChild);
		}
	},
	
	/**
	 * Adds a contact item to the tree widget.
	 *
	 * Creates root level addressbook container item if not present.
	 *
	 * If differences are given as Array of Array(local,remote,propertyname)
	 * the contact is created as container with subentries for each
	 * property.
	 *
	 * @param addressBookURI addressbook URI
	 * @param addressBookName addressbook display name
	 * @param localName Thunderbird ressource display name of a contact
	 * @param remoteName external ressource display name of a contact
	 * @param filepath path to the external ressource file
	 * @param differences array of differing properties, or null
	 * @return added treeitem element
	 */
	addTreeItem: function (addressBookURI,addressBookName,localName,remoteName,filePath,differences) {
		var addressBookItem = document.getElementsByAttribute("addressBookURI",addressBookURI)[0];
		if (addressBookItem == null) {
			addressBookItem = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treeitem"
			);
			addressBookItem.setAttribute("container","true");
			addressBookItem.setAttribute("open","true");
			addressBookItem.setAttribute("class","ThunderSyncDialog.treeitem.dir");
			addressBookItem.setAttribute("addressBookURI",addressBookURI);
			addressBookItem.allowEvents = true;
			
			var row = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treerow"
			);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			cell.setAttribute("label",addressBookName);
			row.appendChild(cell);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			row.appendChild(cell);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			row.appendChild(cell);
			addressBookItem.appendChild(row);
			
			var children = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treechildren"
			);
			addressBookItem.appendChild(children);
			
			document.getElementById("ThunderSyncDialog.treechildren")
				.appendChild(addressBookItem);
		}
		
		var item = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treeitem"
		);
		item.setAttribute("class","ThunderSyncDialog.treeitem.contact");
		
		var row = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treerow"
		);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",localName);
		cell.setAttribute("class","ThunderSyncDialog.treecell.local");
		row.appendChild(cell);
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",this.getMode(localName,remoteName));
		cell.setAttribute("class","ThunderSyncDialog.treecell.mode");
		row.appendChild(cell);
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",remoteName);
		cell.setAttribute("class","ThunderSyncDialog.treecell.remote");
		if (filePath != null) {
			cell.setAttribute("filePath",filePath);
		}
		row.appendChild(cell);
		item.appendChild(row);
		
		if (differences != null) {
			var stringsBundle = document.getElementById("string-bundle");
			
			item.setAttribute("container","true");
			var children = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treechildren"
			);
			
			for (var i = 0; i < differences.length; i++) {
				var propitem = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treeitem"
				);
				propitem.setAttribute("class","ThunderSyncDialog.treeitem.property");
				
				var row = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treerow"
				);
				
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",differences[i][0]);
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.local");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",this.getMode(differences[i][0],differences[i][1]));
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.mode");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",differences[i][1]);
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.remote");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				try {
					var proptype = stringsBundle.getString(differences[i][2]);
				} catch (exception) {
					var proptype = "";
				}
				cell.setAttribute("label",proptype);
				cell.setAttribute("value",differences[i][2]);
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.type");
				row.appendChild(cell);
				propitem.appendChild(row)
				children.appendChild(propitem)
			}
			item.appendChild(children);
			this.checkTreeContactItem(item);
		}
		addressBookItem.getElementsByTagName("treechildren")[0].appendChild(item);
	},
	
	/**
	 * Compares two nsIAbCards by comparing their properties.
	 *
	 * Photo files are converted to data strings and compared.
	 * Embedded photo (e.g. from vCards) data is assumed to be stored as
	 *    PhotoName = ""
	 *    PhotoType = "binary"
	 *    PhotoURI  = binary photo data string
	 *
	 * @param card1 nsIAbCard
	 * @param card2 nsIAbCard
	 * @return array of differences [value_card1,value_card2,propertyname]
	 */
	cardDifferences: function (card1,card2) {
		var properties = Array.concat(
			ThunderSyncVCardLib.baseProperties,
			ThunderSyncVCardLib.otherProperties
		);
		var result = [];
		
		var mode = "";
		var prop1 = "";
		var prop2 = "";
		for (var i = 0; i < properties.length; i++) {
			prop1 = card1.getProperty(properties[i],"");
			prop2 = card2.getProperty(properties[i],"");
			if (prop1 == 0) { prop1 = ""; }
			if (prop2 == 0) { prop2 = ""; }
			if (prop1 != prop2) { result.push([prop1,prop2,properties[i]]); }
		}
		
		var photoname1 = card1.getProperty("PhotoName","");
		var phototype1 = card1.getProperty("PhotoType","");
		var photouri1 = card1.getProperty("PhotoURI","");
		switch (phototype1) {
			case "generic":
				photouri1 = "";
				break;
			case "file":
				photouri1 = ThunderSyncVCardLib.readPhotoFromProfile(photoname1);
				break;
		}
		var photoname2 = card2.getProperty("PhotoName","");
		var phototype2 = card2.getProperty("PhotoType","");
		var photouri2 = card2.getProperty("PhotoURI","");
		switch (phototype2) {
			case "generic":
				photouri2 = "";
				break;
			case "file":
				photouri2 = ThunderSyncVCardLib.readPhotoFromProfile(photoname1);
				break;
		}
		if (photouri1  != photouri2) {
			photouri1 = (photouri1 != "") ? "<Photo>" : "";
			photouri2 = (photouri2 != "") ? "<Photo>" : "";
			result.push([photouri1,photouri2,"Photo"]);
		}
		
		return result;
	},
	
	/**
	 * Create a file object using last name, first name, format string
	 * and target directory
	 *
	 * Example (format="vcard"): dir/LastName_FirstName.vcf
	 *
	 * @param lastName last name, used as first part of the filename
	 * @param firstName first name, used as second part of the filename
	 * @param format file format string, e.g. "vcard"
	 * @param dir path to the target directory
	 * @return nsIFile object pointing to constructed filename
	 */
	createFileName: function (lastName,firstName,format,dir) {
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(dir);
		switch (format) {
			case "vcard":
				file.append(lastName + "_" + firstName + ".vcf");
				break;
			default:
				file.append(lastName + "_" + firstName + ".txt");
		}
		return file;
	},
	
	/**
	 * Write a nsIAbCard to a file of given format at given path using
	 * given character encoding.
	 *
	 * @card nsIAbCard card to write
	 * @format format file format string, e.g. "vcard"
	 * @filePath filePath nsIFile object pointing to target file path
	 */
	fromCard: function (card,format,filePath) {
		var fStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Components.interfaces.nsIConverterOutputStream);
		
		fStream.init(filePath,0x02|0x08|0x20,0600,0);
		switch (format) {
			case "vcard":
				var encoding = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefService)
					.getBranch("extensions.ThunderSync.")
					.getCharPref("exportEncoding");
				if (encoding == "Standard") { encoding = "UTF-8"; }
				converter.init(fStream, encoding, 0, 0);
				try {
					converter.writeString(
						ThunderSyncVCardLib.fromCard(
							card,
							encoding
						)
					);
				}
				catch (exception) {
					converter.init(fStream, "UTF-8", 0, 0);
					try {
						converter.writeString(
							ThunderSyncVCardLib.fromCard(
								card,
								"UTF-8"
							)
						);
					}
					catch (exception) {
						// neither custom encoding
						// nor Unicode works: ignore
					}
				}
				converter.close();
				break;
		}
	},
	
	/**
	 * Create a nsIAbCard from a given file of given format using
	 * given character encoding.
	 *
	 * @param file nsIFile object
	 * @param format file format string, e.g. "vcard"
	 */
	toCard: function (file,format) {
		var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
 		fStream.init(file,-1,0,0);
		
// 		var converter = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
// 			.createInstance(Components.interfaces.nsIConverterInputStream);
// 		var datastr = "";
		
		switch (format) {
			case "vcard":
// 				converter.init(fStream, "ISO-8859-1", 0, 0);
// 				let (bufferstr = {}) {
// 					let bytes = 0;
// 					do {
// 						bytes = converter.readString(0xffffffff, bufferstr);
// 						datastr += bufferstr.value;
// 					} while (bytes != 0);
// 				}
// 				converter.close();
				var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
				bStream.setInputStream(fStream);
				var datastr = bStream.readBytes(bStream.available());
				bStream.close();
				
				var encoding = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefService)
					.getBranch("extensions.ThunderSync.")
					.getCharPref("importEncoding");
				if (encoding == "Standard") { encoding = "ISO-8859-1"; }
				card = ThunderSyncVCardLib.toCard(datastr,encoding);
				break;
			default:
				var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
					.createInstance(Components.interfaces.nsIAbCard);
		}
		fStream.close();
		return card;
	},
	
	/**
	 * Retrieve contact from given addressbook using last name and
	 * first name as matching properties.
	 *
	 * Only returns the first match.
	 *
	 * @param addressBook nsIAbDirectory as contact ressource
	 * @param lastName last name string
	 * @param firstName first name string
	 * @return nsIAbCard or null
	 */
	retrieveCardFromAddressBook: function (addressBook,lastName,firstName) {
		var cards = addressBook.getCardsFromProperty("LastName",lastName,false);
		if (cards instanceof Components.interfaces.nsISimpleEnumerator) {
			while (cards.hasMoreElements()) {
				var card = cards.getNext();
				if ((card instanceof Components.interfaces.nsIAbCard)
					&& (firstName == card.firstName)) {
					return card;
				}
			}
		}
		return null;
	},
	
	/**
	 * Retrieve contact from file with given format in given path
	 * using last name and first name as matching properties.
	 *
	 * Only returns the first match.
	 *
	 * @param dir directory to look into
	 * @param format format string of expected files (e.g. vcard)
	 * @param lastName last name string
	 * @param firstName first name string
	 * @return [nsIFile,nsIAbCard] or null
	 **/
	retrieveCardFromPath: function (dir,format,lastName,firstName) {
		var directory = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		directory.initWithPath(dir);
		var files = directory.directoryEntries;
		while (files.hasMoreElements()) {
			var file = files.getNext();
			file.QueryInterface(Components.interfaces.nsIFile);
			if (file.isFile()) {
				var card = this.toCard(file,format);
				if (card.lastName = lastName && card.firstName == firstName) {
					return [file,card];
				}
			}
		}
		return null;
	},
						
	/**
	 *
	 */
	compare: function () {
		try {
			var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.");
			var format = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.getCharPref("exportFormat");
		}
		catch (exception) { return; }
		
		this.clearTree();
		
		var list_missing_local = new Array();
		var list_missing_remote = new Array();
		var list_diff = new Array();
		var list_equal = new Array();
		var list_checked = new Array();
		
		//
		// iterate over all addressbooks
		//
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var allAddressBooks = abManager.directories;
		var ablist = document.getElementById("ThunderSyncPreferences.list.addressbook");
		while (allAddressBooks.hasMoreElements()) {
			var addressBook = allAddressBooks.getNext();
			if (!(addressBook instanceof Components.interfaces.nsIAbDirectory)) {
				continue;
			}
			try {
				var dir = prefs.getCharPref(
					addressBook.fileName.replace(".mab","")
				);
			} catch (exception) {
				continue;
			}
			if (dir == "") { continue; }
			
			//
			// read all contacts from path
			// if contact is found in phonebook: compare and
			// add to list_diff if different,
			// otherwise add to list_missing_local list
			//
			var directory = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
			directory.initWithPath(dir);
			var files = directory.directoryEntries;
			while (files.hasMoreElements()) {
				var file = files.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				if (!file.isFile()) { continue; }
				var remoteCard = this.toCard(file,format);
				if (remoteCard == null) { continue; }
				
				var checked = false;
				var localCard = this.retrieveCardFromAddressBook(
					addressBook,
					remoteCard.lastName,
					remoteCard.firstName
				);
				if (localCard instanceof Components.interfaces.nsIAbCard) {
					var diff = this.cardDifferences(localCard,remoteCard);
					if (diff.length > 0) {
						this.addTreeItem(
							addressBook.URI,
							addressBook.dirName,
							localCard.lastName + ", " + localCard.firstName,
							remoteCard.lastName + ", " + remoteCard.firstName,
							file.path,
							diff
						);
					}
					checked = true;
					list_checked.push(
						localCard.lastName + ", " + localCard.firstName
					);
				}
				if (!checked) {
					this.addTreeItem(
						addressBook.URI,
						addressBook.dirName,
						"",
						remoteCard.lastName + ", " + remoteCard.firstName,
						file.path,
						null
					);
				}
			}
			
			//
			// read all contacts from addressbook;
			// if not yet checked (not in list_checked): store
			// in list_missing_remote
			//
			var cards = addressBook.childCards;
			while (cards.hasMoreElements()) {
				var card = cards.getNext();
				if (card instanceof Components.interfaces.nsIAbCard) {
					var localName = card.lastName + ", " + card.firstName;
					if (list_checked.indexOf(localName) == -1) {
						this.addTreeItem(
							addressBook.URI,
							addressBook.dirName,
							localName,
							"",
							null,
							null
						);
					}
				}
			}
		}
		
		if (document.getElementsByClassName("ThunderSyncDialog.treecell.mode").length == 0) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			var stringsBundle = document.getElementById("string-bundle");
			promptService.alert(
				null,
				stringsBundle.getString("informationDialogTitle"),
				stringsBundle.getString("alreadySyncText")
			);
		}
		else {
			this.checkIfSyncReady();
		}
	},
	
	/**
	 *
	 */
	changeItemState: function () {
		try {
			var tree = document.getElementById("ThunderSyncDialog.tree");
			var selectedItem = tree
				.treeBoxObject.view
				.getItemAtIndex(tree.currentIndex);
		}
		catch (exception) {
			return;
		}
		
		var cell = selectedItem.getElementsByTagName("treecell");
		
		switch (cell[1].getAttribute("label")) {
			case this.modeUnequal:
				cell[0].removeAttribute("properties");
				cell[1].setAttribute("label",this.modeFromLocal);
				cell[1].removeAttribute("properties");
				cell[2].setAttribute("properties","deleteItem");
				break;
			case this.modeFromLocal:
				if (cell[1].getAttribute("properties") == "deleteItem") {
						cell[0].removeAttribute("properties");
						cell[1].setAttribute("label",this.modeFromLocal);
						cell[1].removeAttribute("properties");
						cell[2].setAttribute("properties","deleteItem");
				}
				else {
					cell[0].setAttribute("properties","deleteItem");
					cell[2].removeAttribute("properties");
					if (cell[2].getAttribute("label") == "") {
						cell[1].setAttribute("properties","deleteItem");
					}
					else {
						cell[1].setAttribute("label",this.modeFromRemote);
						cell[1].removeAttribute("properties");
					}
				}
				break;
			case this.modeFromRemote:
				if (cell[1].getAttribute("properties") == "deleteItem") {
					cell[0].setAttribute("properties","deleteItem");
					cell[1].setAttribute("label",this.modeFromRemote);
					cell[1].removeAttribute("properties");
					cell[2].removeAttribute("properties");
				}
				else {
					cell[0].removeAttribute("properties");
					cell[2].setAttribute("properties","deleteItem");
					if (cell[0].getAttribute("label") == "") {
						cell[1].setAttribute("properties","deleteItem");
					}
					else {
						cell[1].setAttribute("label",this.modeFromLocal);
						cell[1].removeAttribute("properties");
					}
				}
				break;
		}
		if (selectedItem.getAttribute("class") == "ThunderSyncDialog.treeitem.property") {
			this.checkTreeContactItem(selectedItem.parentNode.parentNode);
		}
		this.checkIfSyncReady();
	},
	
	/**
	 *
	 */
	checkIfSyncReady: function () {
		var properties =  document
			.getElementsByClassName("ThunderSyncDialog.treecell.property.mode");
		
		var unequal = false;
		for (var i = 0; i < properties.length; i++) {
			if (properties[i].getAttribute("label") == this.modeUnequal) {
				unequal = true;
				break;
			}
		}
		document.getElementById("ThunderSyncDialog.button.sync").setAttribute("disabled",unequal.toString());
	},
	
	/**
	 *
	 */
	mergeProperties: function (propType,propMode,propDeleted,localCard,remoteCard) {
		switch (propMode) {
			case this.modeFromLocal:
				if (propDeleted) {
					// delete local property
					localCard.setProperty(propType,"");
				}
				else {
					// create external property
					remoteCard.setProperty(
						propType,
						localCard.getProperty(propType,"")
					);
				}
				break;
			case this.modeFromRemote:
				if (propDeleted) {
					// delete external property
					remoteCard.setProperty(propType,"");
				}
				else {
					// set local property
					localCard.setProperty(
						propType,
						remoteCard.getProperty(propType,"")
					);
				}
				break;
		}
	},
	
	/**
	 *
	 */
	removePhotoFile: function(card) {
		if (card.getProperty("PhotoType","") != "file") { return; }
		
		var photoFile = Components
			.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		photoFile.append("Photos");
		photoFile.append(card.getProperty("PhotoName",""));
		try {
			if (photoFile.isFile() && photoFile.exists()) {
				photoFile.remove(false);
				card.setProperty("PhotoName","");
				card.setProperty("PhotoType","");
				card.setProperty("PhotoURI","");
			}
		}
		catch (exception) {}
	},
	
	/**
	 *
	 */
	processPhotoInformation: function(card) {
		// only do something if the card contains embedded binary data
		if (card.getProperty("PhotoType","") != "binary") { return; }
		
		//
		// create random number filename in Profile/Photos
		//
		var photoDir = Components
			.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		photoDir.append("Photos");
		try {
			if (!photoDir.isDirectory()) { throw "undefined"; }
		}
		catch (exception) { return; }
		
		var datastr = card.getProperty("PhotoURI","");
		var suffix = ThunderSyncVCardLib.determinePhotoSuffix(datastr.substr(0,8));
		var filename = "";
		do {
			filename = new String(Math.random()).replace("0.", "") + "." + suffix;
			var newImageFile = photoDir.clone();
			newImageFile.append(filename);
		} while (newImageFile.exists());
		
		var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);  
		stream.init(newImageFile,0x04|0x08|0x20,0600,0);
		stream.write(datastr,datastr.length);
		if (stream instanceof Components.interfaces.nsISafeOutputStream) {  
			stream.finish();  
		}
		else {  
			stream.close();  
		}
		
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		
		card.setProperty("PhotoType","file");
		card.setProperty("PhotoName",newImageFile.leafName);
		card.setProperty("PhotoURI",ios.newFileURI(newImageFile).spec);
	},
	
	/**
	 *
	 */
	mergePhotoProperty: function (propMode,propDeleted,localCard,remoteCard) {
		switch (propMode) {
			case this.modeFromLocal:
				if (propDeleted) {
					// delete local property
					localCard.setProperty("PhotoName","");
					localCard.setProperty("PhotoType","");
					localCard.setProperty("PhotoURI","");
				}
				else {
					// create external property
					remoteCard.setProperty("PhotoName",localCard.getProperty("PhotoName",""));
					remoteCard.setProperty("PhotoType",localCard.getProperty("PhotoType",""));
					remoteCard.setProperty("PhotoURI", localCard.getProperty("PhotoURI",""));
				}
				break;
			case this.modeFromRemote:
				if (propDeleted) {
					// delete external property
					remoteCard.setProperty("PhotoName","");
					remoteCard.setProperty("PhotoType","");
					remoteCard.setProperty("PhotoURI","");
				}
				else {
					// set local property
					this.removePhotoFile(localCard);
					localCard.setProperty("PhotoName",remoteCard.getProperty("PhotoName",""));
					localCard.setProperty("PhotoType",remoteCard.getProperty("PhotoType",""));
					localCard.setProperty("PhotoURI", remoteCard.getProperty("PhotoURI",""));
					this.processPhotoInformation(localCard);
				}
				break;
		}
	},
	
	/**
	 * Synchronise using information in the tree.
	 */
	sync: function () {
		try {
			var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.");
			var format = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.")
				.getCharPref("exportFormat");
		}
		catch (exception) { return; }
		
 		var progressCounter = 0;
 		var progressMax = document.getElementsByClassName("ThunderSyncDialog.treeitem.contact").length;
 		var progressMeter = document.getElementById("ThunderSyncDialog.progressmeter")
		
		var abManager = Components.classes["@mozilla.org/abmanager;1"]
			.getService(Components.interfaces.nsIAbManager);
		
		var addressBooks = document.getElementsByAttribute("addressBookURI","*");
		
		for (var i = 0; i < addressBooks.length; i++) {
			try {
				var addressBook = abManager.getDirectory(addressBooks[i].getAttribute("addressBookURI"));
			} catch (exception) {
				continue;
			}
			
			contacts = addressBooks[i]
				.getElementsByClassName("ThunderSyncDialog.treeitem.contact");
			var cardsToDelete = Components.classes["@mozilla.org/array;1"]
				.createInstance(Components.interfaces.nsIMutableArray);
			for (var k = 0; k < contacts.length; k++) {
				var localName = contacts[k]
					.getElementsByClassName("ThunderSyncDialog.treecell.local")[0]
					.getAttribute("label")
					.split(", ");
				var remoteName = contacts[k]
					.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
					.getAttribute("label")
					.split(", ");
				var modecell = contacts[k]
					.getElementsByClassName("ThunderSyncDialog.treecell.mode")[0];
				var mode = modecell.getAttribute("label");
				var modeDeleted = modecell.getAttribute("properties") == "deleteItem";
				
				progressCounter++;
				progressMeter.setAttribute(
					"value",
					(100*progressCounter/progressMax) + "%"
				);
				
				switch (mode) {
					case this.modeExchange:
						//
						// local and remote entry differ,
						// process properties
						//
						var localCard = this.retrieveCardFromAddressBook(
							addressBook,localName[0],localName[1]
						);
						if (localCard == null) { break; }
						try {
							var dir = prefs.getCharPref(
								addressBook.fileName.replace(".mab","")
							);
						} catch (exception) {
							continue;
						}
						if (dir == "") { break; }
						
						var remoteFile = Components.classes["@mozilla.org/file/local;1"]
							.createInstance(Components.interfaces.nsILocalFile);
						
						remoteFile.initWithPath(contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("filePath")
						);
						var remoteCard = this.toCard(remoteFile,format);
						
						//
						// iterate over properties given in tree
						// and apply changes
						//
						var properties = contacts[k].getElementsByClassName("ThunderSyncDialog.treeitem.property");
						for (var j = 0; j < properties.length; j++) {
							var propType = properties[j]
								.getElementsByClassName("ThunderSyncDialog.treecell.property.type")[0]
								.getAttribute("value");
							
							var propModeCell = properties[j]
								.getElementsByClassName("ThunderSyncDialog.treecell.property.mode")[0];
							var propMode = propModeCell.getAttribute("label");
							var propDeleted = propModeCell.getAttribute("properties") == "deleteItem";
							
							if (propType != "Photo") {
								this.mergeProperties(
									propType,
									propMode,
									propDeleted,
									localCard,
									remoteCard
								);
							}
							else {
								this.mergePhotoProperty(
									propMode,
									propDeleted,
									localCard,
									remoteCard
								);
							}
						}
						if (localCard.lastName == "") {
							cardsToDelete.append(localCard,false);
							var rev = 0
						}
						else {
							if (localCard.firstName != "") {
								localCard.displayName = localCard.lastName + ", " + localCard.firstName;
							}
							else {
								localCard.displayName = localCard.lastName;
							}
							addressBook.modifyCard(localCard);
							var rev = localCard.getProperty("LastModifiedDate",0);
						}
						if (rev == 0) { rev = Date.parse(Date()) / 1000; }
						
						if (remoteCard.lastName != "") {
							if (remoteCard.firstName != "") {
								remoteCard.displayName = remoteCard.lastName + ", " + remoteCard.firstName;
							}
							else {
								remoteCard.displayName = remoteCard.lastName;
							}
							remoteCard.setProperty(
								"LastModifiedDate",
								rev
							);
							this.fromCard(
								remoteCard,
								format,
								remoteFile
							);
						}
						break;
					
					case this.modeFromLocal:
						var localCard = this.retrieveCardFromAddressBook(
							addressBook,localName[0],localName[1]
						);
						if (localCard == null) { break; }
						
						if (modeDeleted) {
							// delete local contact
							cardsToDelete.appendElement(localCard,false);
						}
						else {
							// create external contact from local contact
							try {
								var dir = prefs.getCharPref(
									addressBook.fileName.replace(".mab","")
								);
							} catch (exception) {
								break;
							}
							if (dir != "") {
								var remotePath = contacts[k]
									.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
									.getAttribute("filePath");
								if (remotePath != "") {
									var remoteFile = Components.classes["@mozilla.org/file/local;1"]
										.createInstance(Components.interfaces.nsILocalFile);
									remoteFile.initWithPath(remotePath);
								}
								else {
									var remoteFile = this.createFileName(
										localCard.lastName,
										localCard.firstName,
										format,
										dir
									)
								}
								this.fromCard(
									localCard,
									format,
									remoteFile
								);
							}
						}
						break;
						
					case this.modeFromRemote:
						var remoteFile = Components.classes["@mozilla.org/file/local;1"]
							.createInstance(Components.interfaces.nsILocalFile);
						
						remoteFile.initWithPath(contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("filePath")
						);
						
						if (modeDeleted) {
							// delete external contact
							remoteFile.remove(false);
						}
						else {
							// create local contact from external contact
							var localCard = this.toCard(remoteFile,format);
							this.processPhotoInformation(localCard);
							addressBook.addCard(localCard);
						}
						break;
				}
			}
			if (cardsToDelete.length > 0) {
				addressBook.deleteCards(cardsToDelete);
			}
		}
		
		progressMeter.setAttribute("value","0%");
		
		//
		// done: clear tree and disable sync button
		//
		this.clearTree();
		document.getElementById("ThunderSyncDialog.button.sync").setAttribute("disabled","true");
	}
}
