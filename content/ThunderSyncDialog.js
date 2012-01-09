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
		Unicode symbols for "mode" column 
	*/
	modeFromLocal:    ">>",
	modeFromRemote:   "<<",
	modeUnequal:      "!=",
	modeExchange:     "<>",
	
	/**
	 * Compares to string values and returns a mode character:
	 *   value1 == "" && value2 != "": this.modeFromRemote
	 *   value1 != "" && value2 == "": this.modeFromLocal
	 *   otherwise: this.modeUnequal
	 *
	 * @param localValue string value of local resource
	 * @param remoteValue string value of remote resource
	 * @return mode character
	 */
	getMode: function (localValue,remoteValue) {
		if ( (localValue != "") && (remoteValue == "") ) {
			return this.modeFromLocal;
		}
		else {
			if ( (localValue == "") && (remoteValue != "") ) {
				return this.modeFromRemote;
			}
		}
		return this.modeUnequal;
	},
	
	/**
	 * Checks given tree contact property item (if attributes container="true" and
	 * class="ThunderSyncDialog.treeitem.contact") for modes of its child
	 * rows.
	 *
	 * If all rows show same mode: set same mode for contact item.
	 * If all rows show either "from local" or "from remote": set contact item to "exchange"
	 * If at least one "not equal" is present: set contact item to "not equal"
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
		this.CardDB      = new Object();
		this.ModDB       = new Array();
		this.ExpEncDB    = new Object();
		this.ImpEncDB    = new Object();
		this.FormatDB    = new Object();
		this.HideUIDDB   = new Object();
		this.UseQPEDB    = new Object();
		this.DoFoldingDB = new Object();
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
	 * @param abURI addressbook URI
	 * @param abName addressbook display name
	 * @param localCard local contact
	 * @param path path to external contact file
	 * @param index index of external contact in local DB
	 * @param differences list of differences
	 */
	addTreeItem: function (abURI,abName,localCard,path,index,differences) {
		//
		// create display name for local contact. order of evaluation:
		// 1. DisplayName
		// 2. LastName, FirstName
		// 3. LastName
		// 4. FirstName
		// 5. primaryEmail
		// 6. UID
		//
		if (localCard instanceof Components.interfaces.nsIAbCard) {
			var localUID = localCard.getProperty("UID","");
			if (localCard.displayName != "") {
				var localDisplayName = localCard.displayName;
			}
			else {
				if (localCard.lastName != "") {
					var localDisplayName = localCard.lastName;
					if (localCard.firstName != "") {
						localDisplayName += ", " + localCard.firstName;
					}
				}
				else {
					if (localCard.firstName != "") {
						var localDisplayName = localCard.firstName;
					}
					else {
						if (localCard.primaryEmail != "") {
							var localDisplayName = localCard.primaryEmail;
						}
						else {
							var localDisplayName = localUID;
						}
					}
				}
			}
		}
		else {
			// contact is not a nsIAbCard: set to empty strings
			var localUID = "";
			var localDisplayName = "";
		}
		//
		// create display name for remote contact. order of evaluation:
		// 1. DisplayName
		// 2. LastName, FirstName
		// 3. LastName
		// 4. FirstName
		// 5. primaryEmail
		// 6. UID
		// 7. ="???"
		//
		try {
			var remoteCard = this.CardDB[abURI][path][index];
		} catch (exception) {
			var remoteCard = null;
		}
		if (remoteCard instanceof Components.interfaces.nsIAbCard) {
			if (remoteCard.displayName != "") {
				var remoteDisplayName = remoteCard.displayName;
			}
			else {
				if (remoteCard.lastName != "") {
					var remoteDisplayName = remoteCard.lastName;
					if (remoteCard.firstName != "") {
						remoteDisplayName += ", " + remoteCard.firstName;
					}
				}
				else {
					if (remoteCard.firstName != "") {
						var remoteDisplayName = remoteCard.firstName;
					}
					else {
						if (remoteCard.primaryEmail != "") {
							var remoteDisplayName = remoteCard.primaryEmail;
						}
						else {
							try {
								var remoteDisplayName = remoteCard.getProperty("UID","");
							} catch (exception) {
								var remoteDisplayName = "???";
							}
						}
					}
				}
			}
		}
		else {
			// contact is not a nsIAbCard: set to empty string
			var remoteDisplayName = "";
		}
		
		//
		// check if a addressbook tree element exists
		// if not: create a new addressbook treeitem as a container
		//         and store addressbook URI as an attribute for later access
		//
		var addressBookItem = document.getElementsByAttribute("addressBookURI",abURI)[0];
		if (addressBookItem == null) {
			addressBookItem = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treeitem"
			);
			addressBookItem.setAttribute("container","true");
			addressBookItem.setAttribute("open","true");
			addressBookItem.setAttribute("class","ThunderSyncDialog.treeitem.dir");
			addressBookItem.setAttribute("addressBookURI",abURI);
			addressBookItem.allowEvents = true;
			
			var row = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treerow"
			);
			var cell = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"treecell"
			);
			cell.setAttribute("label",abName);
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
		
		//
		// create a new contact tree element
		// this consists of a treerow and some treecell elements,
		// containing local and remote display name as well as sync mode
		// (automatically determined by display name comparison,
		// see getMode function)
		//
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
		cell.setAttribute("label",localDisplayName);
		cell.setAttribute("class","ThunderSyncDialog.treecell.local");
		cell.setAttribute("UID",localUID);
		row.appendChild(cell);
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",this.getMode(localDisplayName,remoteDisplayName));
		cell.setAttribute("class","ThunderSyncDialog.treecell.mode");
		row.appendChild(cell);
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",remoteDisplayName);
		cell.setAttribute("class","ThunderSyncDialog.treecell.remote");
		if (path != null) {
			cell.setAttribute("filePath",path);
		}
		if (index != null) {
			cell.setAttribute("fileIndex",index);
		}
		row.appendChild(cell);
		item.appendChild(row);
		
		//
		// if differences is not an empty array, add a treechildren
		// container to the contact element and populate it with the
		// property differences
		//
		// property elements are created by iterating of differences
		// and are constructed like the contact treeitem
		//
		if (differences.length > 0) {
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
	 * @param card1 card to compare (nsIAbCard)
	 * @param card2 card to compare (nsIAbCard)
	 * @return array of differences [value_card1,value_card2,propertyname], compatible with addTreeItem()
	 */
	cardDifferences: function (card1,card2) {
		// create array of property names: all properties except photo
		var properties = ThunderSyncVCardLib.baseProperties.concat(
			ThunderSyncVCardLib.otherProperties
		);
		var result = [];
		
		// compare these properties one by one and push (i.e. append)
		// differences to result array
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
		
		// prepare contact photo for comparison: if it's a file, read
		// contents and store them as string
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
		
		// prepare other contact photo for comparison: if it's a file,
		// read contents and store them as string
		var photoname2 = card2.getProperty("PhotoName","");
		var phototype2 = card2.getProperty("PhotoType","");
		var photouri2 = card2.getProperty("PhotoURI","");
		switch (phototype2) {
			case "generic":
				photouri2 = "";
				break;
			case "file":
				photouri2 = ThunderSyncVCardLib.readPhotoFromProfile(photoname2);
				break;
		}
		
		// compare photos; push (append) to result array if differing
		if (photouri1  != photouri2) {
			var stringsBundle = document.getElementById("string-bundle");
			if (photouri1 != "") {
				photouri1 = stringsBundle.getString("Photo");
			} else {
				photouri1 = "";
			}
			if (photouri2 != "") {
				photouri2 = stringsBundle.getString("Photo");
			} else {
				photouri2 = "";
			}
			result.push([photouri1,photouri2,"Photo"]);
		}
		
		return result;
	},
	
	/**
	 * Perform a comparison of all specified addressbooks and store results
	 * in ThunderSync's dialog window as tree items.
	 *
	 * @param autoclose boolean variable, if true: close dialog if no differences are found.
	 */
	compare: function (autoclose) {
		//
		// todo: integrate different modes ("no","ask","import","export")
		//
		
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
		var stringsBundle = document.getElementById("string-bundle");
		
		// prepare preferences access for export format and addressbooks
		try {
			var abPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.");
			var fmtPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.exportFormat.");
			var vcfExpEncPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.vCard.exportEncoding.");
			var vcfImpEncPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.vCard.importEncoding.");
			var vcfHideUIDPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.vCard.hideUID.");
			var vcfUseQPEPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.vCard.quotedPrintable.");
			var vcfDoFoldingPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.vCard.folding.");
		}
		catch (exception) {
			// error, not properly configured: inform user!
			promptService.alert(
				null,
				stringsBundle.getString("informationDialogTitle"),
				stringsBundle.getString("notProperlyConfiguredText")
			);
			return;
		}
		// prepare UID generator, initialise checklist and clear tree/database
		var uuidgenerator = Components.classes["@mozilla.org/uuid-generator;1"].getService(Components.interfaces.nsIUUIDGenerator);
		var list_checked = new Array();
		this.clearTree();
		
		//
		// iterate over all contacts in every addressbook
		//
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var allAddressBooks = abManager.directories;
		var ablist = document.getElementById("ThunderSyncPreferences.list.addressbook");
		while (allAddressBooks.hasMoreElements()) {
			// get next item in list; skip if it's not an addressbook
			var addressBook = allAddressBooks.getNext();
			if (!(addressBook instanceof Components.interfaces.nsIAbDirectory)) { continue; }
			var abName = addressBook.fileName.replace(".mab","");
			
			// fetch desired path of addressbook from preferences
			// if this fails, no path was configured: skip addressbook
			try {
				var remoteRessource = abPrefs.getCharPref(abName);
			} catch (exception) {
				continue;
			}
			
			// read addressbook-specific export format from preferences;
			// fall back to vCard if this fails: actually only vCard is available
			try {
				this.FormatDB[addressBook.URI] = fmtPrefs.getCharPref(abName);
			} catch (exception) {
				this.FormatDB[addressBook.URI] = "vCardDir";
			}
			
			// read addressbook-specific export encoding from preferences;
			// fall back to UTF-8 if this fails
			try {
				this.ExpEncDB[addressBook.URI] = vcfExpEncPrefs.getCharPref(abName);
			} catch (exception) {
				this.ExpEncDB[addressBook.URI] = "UTF-8";
			}
			if (this.ExpEncDB[addressBook.URI] == "Standard") { this.ExpEncDB[addressBook.URI] = "UTF-8"; }
			
			// read addressbook-specific import encoding from preferences;
			// fall back to UTF-8 if this fails
			try {
				this.ImpEncDB[addressBook.URI] = vcfImpEncPrefs.getCharPref(abName);
			} catch (exception) {
				this.ImpEncDB[addressBook.URI] = "UTF-8";
			}
			if (this.ImpEncDB[addressBook.URI] == "Standard") { this.ImpEncDB[addressBook.URI] = "ISO-8859-1"; }
			
			// read addressbook-specific vCard preference: encode as Mozilla property?
			try {
				this.HideUIDDB[addressBook.URI] = vcfHideUIDPrefs.getBoolPref(abName);
			} catch (exception) {
				this.HideUIDDB[addressBook.URI] = false;
			}
			
			// read addressbook-specific vCard preference: use quoted-printable encoding?
			try {
				this.UseQPEDB[addressBook.URI] = vcfUseQPEPrefs.getBoolPref(abName);
			} catch (exception) {
				this.UseQPEDB[addressBook.URI] = true;
			}
			
			// read addressbook-specific vCard preference: do line folding?
			try {
				this.DoFoldingDB[addressBook.URI] = vcfDoFoldingPrefs.getBoolPref(abName);
			} catch (exception) {
				this.DoFoldingDB[addressBook.URI] = true;
			}
			
			// no path defined? skip this addressbook
			if (remoteRessource == "") { continue; }
			
			// make sure all addressbook entries have an UID:
			//   iterate over all entries and look for UIDs;
			//   if none is set, generate one.
			var cards = addressBook.childCards;
			var localUID = "";
			while (cards.hasMoreElements()) {
				var card = cards.getNext();
				if (!(card instanceof Components.interfaces.nsIAbCard)) { continue; }
				try {
					// try to read the custom property "UID"
					localUID = card.getProperty("UID","");
				} catch (exception) {
					// seems this property is not defined...
					localUID = "";
				}
				if (localUID == "") {
					// undefined UID: create new one and apply changes
					card.setProperty("UID",uuidgenerator.generateUUID().toString().slice(1,37));
					addressBook.modifyCard(card);
				}
			}
			// read all contacts associated with given dir
			this.read(addressBook.URI,remoteRessource);
			
			// if no entry in database was created: skip addressbook
			if (!this.CardDB[addressBook.URI]) { continue; }
			
			// iterate over path and contacts...
			for (var path in this.CardDB[addressBook.URI]) {
				for (i = 0; i < this.CardDB[addressBook.URI][path].length; i++) {
					//
					// this.CardDB[abURI][path][i] is an nsIAbCard, compare!
					//
					// make sure UID property is defined, even if empty
					// if UID is set: register modification for later use...
					try {
						var remoteUID = this.getProperty(addressBook.URI,path,i,"UID","");
					} catch (exception) {
						var remoteUID = "";
						this.setProperty(addressBook.URI,path,i,"UID","");
					}
					
					//
					// look for addressbook contacts that might match
					// first matching property: UID, if not empty
					var localCard = null;
					var value = "";
					if (remoteUID != "") {
						localCard = addressBook.getCardFromProperty("UID",remoteUID,false);
					}
					else {
						//
						// no UID is set, therefore remote contact is
						// matched to all local contacts:
						// count matching properties and calculate propability
						// (number of matches/total number of properties)
						//
						// matching is democratic, i.e. the card with
						// the greatest propability > 2/3 wins
						//
						var matches = 0;
						var total = 0;
						var propability_max = 0.665;
						var propability = 0;
						var cards = addressBook.childCards;
						while (cards.hasMoreElements()) {
							// get next item in list; skip if it's not a contact
							var card = cards.getNext();
							if (!(card instanceof Components.interfaces.nsIAbCard) || (list_checked.indexOf(card.getProperty("UID","")) == -1)) { continue; }
							matches = 0;
							total = 0;
							for (k=0; k<ThunderSyncVCardLib.baseProperties.length; k++) {
								// compare all base properties
								try {
									value = this.getProperty(
											addressBook.URI,path,i,
											ThunderSyncVCardLib.baseProperties[k],""
									);
								} catch (exception) {
								}
								
								if (value != "") {
									total++;
									if (value == card.getProperty(ThunderSyncVCardLib.baseProperties[k],"")) {
										matches++;
									}
								}
							}
							try {
								// try to calculate propability
								propability = matches/total;
							} catch (exception) {
								// total=0, set propability to zero
								probability = 0;
							}
							if (propability > propability_max) {
								// new greatest propability found...
								propability_max = propability;
								localCard = card;
							}
						}
					}
					//
					// process results:
					//   if a local contact was found: calculate differences
					//   if no contact was found: define a "from-remote" tree item
					//
					if (localCard instanceof Components.interfaces.nsIAbCard) {
						// match found! Add to tree
						// local UID overwrites remote UID
						remoteUID = localCard.getProperty("UID","");
						this.setProperty(addressBook.URI,path,i,"UID",remoteUID);
						var differences = this.cardDifferences(localCard,this.CardDB[addressBook.URI][path][i]);
						if (differences.length > 0) {
							// differences found:
							// add entry: "local name" <--> "external name"
							this.addTreeItem(
								addressBook.URI,
								addressBook.dirName,
								localCard,
								path,
								i,
								differences
							);
						}
					}
					else {
						// no match found, seems to be a new external contact
						if (remoteUID == "") {
							// generate UID for contact
							remoteUID = uuidgenerator.generateUUID().toString().slice(1,37);
							this.setProperty(addressBook.URI,path,i,"UID",remoteUID);
						}
						// add entry: "" <-- "external name"
						this.addTreeItem(
							addressBook.URI,
							addressBook.dirName,
							null,
							path,
							i,
							[]
						);
					}
					// register UID as checked so it's skipped
					// when all addressbook items are processed
					list_checked.push(remoteUID);
				}
			}
			
			//
			// read all contacts from addressbook and process
			// if not yet checked (i.e. not in list_checked)
			//
			var cards = addressBook.childCards;
			while (cards.hasMoreElements()) {
				var card = cards.getNext();
				if ((card instanceof Components.interfaces.nsIAbCard) && (list_checked.indexOf(card.getProperty("UID","")) == -1)) {
					// add entry: "local name" --> ""
					this.addTreeItem(
						addressBook.URI,
						addressBook.dirName,
						card,
						null,
						null,
						[]
					);
				}
			}
		}
		
		//
		// finally, if tree is empty: show a message announcing "all's well"
		// exceptions:
		//   1.) if function was called on startup: don't show message and close dialog
		//   2.) if autoclose parameter is set, automatically close dialog after message
		//
		if (document.getElementsByClassName("ThunderSyncDialog.treecell.mode").length == 0) {
			this.clearTree();
			try {
				var autostartup = window.arguments[0];
			} catch (exception) {
				var autostartup = false;
			}
			if (autostartup == false) {
				promptService.alert(
					null,
					stringsBundle.getString("informationDialogTitle"),
					stringsBundle.getString("alreadySyncText")
				);
			}
			if (autoclose == true || autostartup == false) {
				document.getElementById("ThunderSync.dialog.sync").acceptDialog();
			}
		}
		else {
			// there are differences to sync:
			// enable synchronisation pushbutton
			this.checkIfSyncReady();
		}
	},
	
	/**
	 * Manage state of property tree items. Cycle through synchronisation
	 * states "from local", "from remote" and "not equal" 
	 */
	changeItemState: function () {
		try {
			// get currently selected row in tree
			var tree = document.getElementById("ThunderSyncDialog.tree");
			var selectedItem = tree
				.treeBoxObject.view
				.getItemAtIndex(tree.currentIndex);
		}
		catch (exception) {
			// nothing found, return immediately
			return;
		}
		
		// retrieve all cells of current row:
		//   cell[0] = local contact
		//   cell[1] = synchronisation mode
		//   cell[2] = remote contact
		var cell = selectedItem.getElementsByTagName("treecell");
		
		switch (cell[1].getAttribute("label")) {
			case this.modeUnequal:
				//
				// move from "not equal" to "from local"
				//
				cell[0].removeAttribute("properties");
				cell[1].setAttribute("label",this.modeFromLocal);
				cell[1].removeAttribute("properties");
				cell[2].setAttribute("properties","deleteItem");
				break;
			case this.modeFromLocal:
				//
				// current mode: copy local property to remote contact
				// if mode cell has "deleteItem" property set, this
				// means "delete local"
				//
				// Modifications:
				//   "delete local" --> "from local"
				//   "from local"   --> "delete local" (if no remote property given)
				//   "from local"   --> "from remote" (if remote property given)
				//
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
				//
				// current mode: copy remote property to local contact
				// if mode cell has "deleteItem" property set, this
				// means "delete remote"
				//
				// Modifications:
				//   "delete remote" --> "from remote"
				//   "from remote"   --> "delete remote" (if no local property given)
				//   "from remote"   --> "from local" (if local property given)
				//
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
		// if property was modified: check state of parent
		if (selectedItem.getAttribute("class") == "ThunderSyncDialog.treeitem.property") {
			this.checkTreeContactItem(selectedItem.parentNode.parentNode);
		}
		// and check if all collisions were cleared for synchronisation 
		this.checkIfSyncReady();
	},
	
	/**
	 * Check if all properties in the whole tree are not set to "not equal."
	 * If that's the case, all collisions were resolved and we are ready
	 * for synchronisation.
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
	 * Merge property of two contacts according to mode given in the tree.
	 *
	 * @param propType name of property
	 * @param propMode mode of merging: "from local" or "from remote"
	 * @param propDeleted boolean, true means "delete local" or "delete remote"
	 * @param localCard local contact (nsIAbCard)
	 * @param abURI related addressBook URI
	 * @param path path of remote contact ressource
	 * @param index index of remote contact in this path
	 */
	mergeProperties: function (propType,propMode,propDeleted,localCard,abURI,path,index) {
		switch (propMode) {
			case this.modeFromLocal:
				if (propDeleted) {
					// delete local property
					localCard.setProperty(propType,"");
				}
				else {
					// create external property
					this.setProperty(abURI,path,index,
						propType,
						localCard.getProperty(propType,"")
					);
				}
				break;
			case this.modeFromRemote:
				if (propDeleted) {
					// delete external property
					this.setProperty(abURI,path,index,propType,"");
				}
				else {
					// set local property
					localCard.setProperty(
						propType,
						this.getProperty(abURI,path,index,propType,"")
					);
				}
				break;
		}
	},
	
	/**
	 * Delete image file of a contact in Thunderbird's Photos directory.
	 *
	 * @param card contact to process (nsIAbCard)
	 */
	removePhotoFile: function(card) {
		if (card.getProperty("PhotoType","") != "file") { return; }
		// construct path to image file
		var photoFile = Components
			.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		photoFile.append("Photos");
		photoFile.append(card.getProperty("PhotoName",""));
		// delete file and set properties to empty strings
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
	 * If PhotoType of a Thunderbird contact object is set to binary,
	 * this means that ThunderSync converted an image file to a data string
	 * and stored it into the PhotoURI property.
	 *
	 * This function converts the data string to a proper image file in
	 * Thunderbird's Photos directory and fixes the Photo* properties.
	 *
	 * Type of image file is determined by vCard library, based on magic
	 * numbers inside the data string.
	 *
	 * This function is meant for local contacts, i.e. no cards referenced
	 * by this.CardDB[URI][path][i]! Any modification of such "remote"
	 * cards will not be registered in ModDB!
	 * 
	 * @param card contact to process (nsIAbCard)
	 */
	processPhotoInformation: function(card) {
		// only do something if the card contains embedded binary data
		if (card.getProperty("PhotoType","") != "binary") { return; }
		
		// construct path to Thunderbird's Photos directory
		var photoDir = Components
			.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		photoDir.append("Photos");
		if (!photoDir.exists()) {
			photoDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0775);
		}
		try {
			if (!photoDir.isDirectory()) { throw "undefined"; }
		}
		catch (exception) { return; }
		
		// get data string from PhotoURI and determine file type and suffix
		var datastr = card.getProperty("PhotoURI","");
		var suffix = ThunderSyncVCardLib.determinePhotoSuffix(datastr.substr(0,8));
		var filename = "";
		
		// create a random number filename similar to the ones created by Thunderbird
		do {
			filename = new String(Math.random()).replace("0.", "") + "." + suffix;
			var newImageFile = photoDir.clone();
			newImageFile.append(filename);
		} while (newImageFile.exists());
		
		// write data string to new file
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
		
		// create new I/O service to obtain the new file's URI
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		
		// fix Photo* properties
		card.setProperty("PhotoType","file");
		card.setProperty("PhotoName",newImageFile.leafName);
		card.setProperty("PhotoURI",ios.newFileURI(newImageFile).spec);
	},
	
	/**
	 * Merge photo property of two contacts according to mode given in tree.
	 *
	 * @param propMode mode of merging: "from local" or "from remote"
	 * @param propDeleted boolean, true means "delete local" or "delete remote"
	 * @param localCard local contact (nsIAbCard)
	 * @param abURI related addressBook URI
	 * @param path path of remote contact ressource
	 * @param index index of remote contact in this path
	 */
	mergePhotoProperty: function (propMode,propDeleted,localCard,abURI,path,index) {
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
					this.setProperty(abURI,path,index,"PhotoName",localCard.getProperty("PhotoName",""));
					this.setProperty(abURI,path,index,"PhotoType",localCard.getProperty("PhotoType",""));
					this.setProperty(abURI,path,index,"PhotoURI", localCard.getProperty("PhotoURI",""));
				}
				break;
			case this.modeFromRemote:
				if (propDeleted) {
					// delete external property
					this.setProperty(abURI,path,index,"PhotoName","");
					this.setProperty(abURI,path,index,"PhotoType","");
					this.setProperty(abURI,path,index,"PhotoURI","");
				}
				else {
					// set local property
					this.removePhotoFile(localCard);
					localCard.setProperty("PhotoName",this.getProperty(abURI,path,index,"PhotoName",""));
					localCard.setProperty("PhotoType",this.getProperty(abURI,path,index,"PhotoType",""));
					localCard.setProperty("PhotoURI", this.getProperty(abURI,path,index,"PhotoURI",""));
					this.processPhotoInformation(localCard);
				}
				break;
		}
	},
	
	/**
	 * Synchronise using information in the tree.
	 */
	sync: function () {
		// prepare preferences access for export format and addressbooks
		try {
			var abPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.Addressbooks.");
			var fmtPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.exportFormat.");
		}
		catch (exception) {
			// error, not properly configured: do nothing!
			return;
		}
		
		// get all addressbook URIs from the tree
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var addressBooks = document.getElementsByAttribute("addressBookURI","*");
		for (var i = 0; i < addressBooks.length; i++) {
			// obtain the addressbook for an URI
			try {
				var addressBook = abManager.getDirectory(addressBooks[i].getAttribute("addressBookURI"));
			} catch (exception) {
				continue;
			}
			
			// obtain target format from preferences;
			// fall back to vCard if this fails: actually only vCard is available
			try {
				var format = fmtPrefs.getCharPref(addressBook.fileName.replace(".mab",""));
			} catch (exception) {
				var format = "vCardDir";
			}
			
			// read all contacts that are given in the tree and
			// that are stored in this addressbook
			var contacts = addressBooks[i].getElementsByClassName("ThunderSyncDialog.treeitem.contact");
			var cardsToDelete = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			for (var k = 0; k < contacts.length; k++) {
				//
				// the tree contains all information necessary for data retrieval:
				// local UID, path to and index of external file and mode of operation
				//
				var localUID = contacts[k]
					.getElementsByClassName("ThunderSyncDialog.treecell.local")[0]
					.getAttribute("UID");
				var modecell = contacts[k]
					.getElementsByClassName("ThunderSyncDialog.treecell.mode")[0];
				var mode = modecell.getAttribute("label");
				var modeDeleted = modecell.getAttribute("properties") == "deleteItem";
				
				switch (mode) {
					case this.modeExchange:
						//
						// local and remote entry differ,
						// process properties
						//
						var localCard = addressBook.getCardFromProperty("UID",localUID,false);
						if (localCard == null) { break; }
						
						var path = contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("filePath");
						var index = contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("fileIndex");
						try {
							var remoteUID = this.getProperty(addressBook.URI,path,index,"UID","");
						} catch (exception) {
							var remoteUID = ""
						}
						
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
								this.mergeProperties(propType,propMode,propDeleted,localCard,addressBook.URI,path,index);
							}
							else {
								this.mergePhotoProperty(propMode,propDeleted,localCard,addressBook.URI,path,index);
							}
						}
						addressBook.modifyCard(localCard);
						var rev = localCard.getProperty("LastModifiedDate",0);
						if (rev == 0) { rev = Date.parse(Date()) / 1000; }
						
						if (remoteUID == "") {
							this.setProperty(addressBook.URI,path,index,"UID",localUID);
						}
						this.setProperty(addressBook.URI,path,index,"LastModifiedDate",rev);
						break;
					
					case this.modeFromLocal:
						//
						// local contact should be copied to external file
						//
						var localCard = addressBook.getCardFromProperty("UID",localUID,false);
						if (localCard == null) { break; }
						
						if (modeDeleted) {
							// delete local contact
							cardsToDelete.appendElement(localCard,false);
						}
						else {
							// add new contact to CardDB
							this.addCard(
								abURI,
								abPrefs.getCharPref(addressBook.fileName.replace(".mab","")),
								format,
								localCard
							);
						}
						break;
						
					case this.modeFromRemote:
						//
						// external file should be copied to local contact
						//
						var path = contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("filePath");
						var index = contacts[k]
							.getElementsByClassName("ThunderSyncDialog.treecell.remote")[0]
							.getAttribute("fileIndex");
						
						if (modeDeleted) {
							// mark external as to delete contact
							this.deleteCard(addressBook.URI,path,index);
						}
						else {
							// create local contact from external contact
							// copy card from CardDB to local variable,
							// process photo information and add to addressbook
							var localCard = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
									.createInstance(Components.interfaces.nsIAbCard);
							localCard.copy(this.CardDB[addressBook.URI][path][index]);
							this.processPhotoInformation(localCard);
							addressBook.addCard(localCard);
						}
						break;
				}
			}
			//
			// all local contacts that ought to be deleted are
			// collected in a mutable array "cardsToDelete"
			// after all's done: delete these cards
			//
			if (cardsToDelete.length > 0) {
				addressBook.deleteCards(cardsToDelete);
			}
		}
		//
		// now that all's sorted out: execute write ops
		//
		this.write();
		
		//
		// done: clear tree and disable sync button
		//
		this.clearTree();
		document.getElementById("ThunderSyncDialog.button.sync").setAttribute("disabled","true");
	},
	
	/**
	 * Create a contact file object using the contact's UID, a target
	 * directory and a format-specific suffix.
	 *
	 * If no proper UID is given, a random non-existing filename is created.
	 *
	 * Example (format="vCardDir"): dir/UID.vcf
	 *
	 * @param format file format string, e.g. "vCardDir" or "vCardFile"
	 * @param dir path to target directory
	 * @param uid UID, used as main file name component
	 * @return nsIFile object pointing to constructed filename
	 */
	createFileName: function (format,dir,uid) {
		try {
			var directory = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
			directory.initWithPath(dir);
		}
		catch (exception) {
			return null;
		}
		
		switch (format) {
			case "vCardDir":
			case "vCardFile":
				var suffix = ".vcf";
				break;
			default:
				var suffix = ".txt";
		}
		
		try{
			// check UID length and try to create filename
			if (uid.length > 0) {
				var file = directory.clone();
				file.append(uid+suffix);
			} else {
				throw "missing uid";
			}
		} catch (exception) {
			// uid filename creation failed:
			// create random number filename
			do {
				var filename = new String(Math.random()).replace("0.", "") + suffix;
				var file = directory.clone();
				file.append(filename);
			} while (file.exists());
		}
		
		return file;
	},
	
	/**
	 * Write all modified contacts back to their files and delete if necessary.
	 */
	write: function () {
		var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		var fStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
				.createInstance(Components.interfaces.nsIFileOutputStream);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
				.createInstance(Components.interfaces.nsIConverterOutputStream);
		
		var abURI = "";
		var path  = "";
		var dataString = "";
		for (i=0; i<this.ModDB.length; i++) {
			abURI = this.ModDB[i][0];
			path  = this.ModDB[i][1];
			dataString = "";
			
			for (k=0; k<this.CardDB[abURI][path].length; k++) {
				if (this.CardDB[abURI][path][k] instanceof Components.interfaces.nsIAbCard) {
					// at least one contact exists: process contact
					switch (format) {
						case "vCardDir":
						case "vCardFile":
							if (dataString.length > 0) { dataString += ThunderSyncVCardLib.CRLF; }
							dataString += ThunderSyncVCardLib.createVCardString(
								this.CardDB[abURI][path][k],
								this.ExpEncDB[abURI],
								this.HideUIDDB[abURI],
								this.UseQPEDB[abURI],
								this.DoFoldingDB[abURI]
							)
							break;
					}
				}
			}
			file.initWithPath(path);
			if (dataString.length > 0) {
				// yep, file should be written...
				// initialise file stream object
				fStream.init(file,0x02|0x08|0x20,0600,0);
				switch (this.FormatDB[abURI]) {
					case "vCardDir":
					case "vCardFile":
						// a vCard ought to be written...
						// fix Outlook's non-standard behaviour:
						// apply a different encoding chosen by the user
						converter.init(fStream, this.ExpEncDB[abURI], 0, 0);
						try {
							converter.writeString(dataString);
						} catch (exception) {
							// user defined encoding did not work:
							// fall back to Unicode
							// i.e. re-encode data string
							dataString = "";
							for (k=0; k<this.CardDB[abURI][path].length; k++) {
								if (this.CardDB[abURI][path][k] instanceof Components.interfaces.nsIAbCard) {
									if (dataString.length > 0) { dataString += ThunderSyncVCardLib.CRLF; }
									dataString += ThunderSyncVCardLib.createVCardString(
										this.CardDB[abURI][path][k],
										"UTF-8",
										this.HideUID[abURI],
										this.UseQPEDB[abURI],
										this.DoFoldingDB[abURI]
									)
								}
							}
							// try again to write data string to stream
							converter.init(fStream, "UTF-8", 0, 0);
							try {
								converter.writeString(dataString);
							} catch (exception) {
								// neither custom encoding
								// nor Unicode works: ignore
							}
						}
						converter.close();
						break;
				}
				fStream.close();
			} else {
				// ressource at abURI/path does not contain any contacts: delete file
				// remove...
				file.remove(false);
			}
		}
	},
	
	/**
	 * Read all contacts from given file ressource in given file format and
	 * store them in local memory; addressed via addressbook URI, path and index.
	 * 
	 * @param abURI URI of the corresponding addressbook
	 * @param path path to teh file ressource
	 */
	read: function (abURI,path) {
		var ressource = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		ressource.initWithPath(path);
		ressource.QueryInterface(Components.interfaces.nsIFile);
		
		if (ressource.exists()) {
			if (ressource.isFile()) {
				var cards = this.readContactsFromFile(
						ressource,
						this.FormatDB[abURI],
						this.ImpEncDB[abURI]);
				if (cards.length > 0) {
					if (!this.CardDB[abURI]) {
						this.CardDB[abURI] = new Object();
					}
					if (!this.CardDB[abURI][path]) {
						this.CardDB[abURI][path] = new Array();
					}
					this.CardDB[abURI][path] = this.CardDB[abURI][path].concat(cards);
				}
			}
			else { if (ressource.isDirectory()) {
				var files = ressource.directoryEntries;
				while (files.hasMoreElements()) {
					// get next item in list; skip if it's not a file object
					var file = files.getNext();
					file.QueryInterface(Components.interfaces.nsIFile);
					if (file.isFile()) {
						var cards = this.readContactsFromFile(
								file,
								this.FormatDB[abURI],
								this.ImpEncDB[abURI]);
						if (cards.length > 0) {
							if (!this.CardDB[abURI]) {
								this.CardDB[abURI] = new Object();
							}
							if (!this.CardDB[abURI][file.path]) {
								this.CardDB[abURI][file.path] = new Array();
							}
							this.CardDB[abURI][file.path] = this.CardDB[abURI][file.path].concat(cards);
						}
					}
				}
			}}
		}
	},
	
	/**
	 * Write a message to Thunderbird's error console
	 * 
	 * @param msg message string
	 */
	logMsg: function (msg) {
		var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		consoleService.logStringMessage("ThunderSync: "+msg);
	},

	/**
	 * Extract all contacts in given format from a given file ressource.
	 *
	 * An Array will be returned, consisting of all extracted nsIAbCards:
	 *    (nsIAbCard, nsIAbCard, ...)
	 * 
	 * If file points to an unknown ressource or a directory,
	 * an empty array is returned.
	 * 
	 * @param fileRessource  nsIFile object, remote ressource file
	 * @param format file format string, e.g. "vCardDir" or "vCardFile"
	 * @param encoding import encoding
	 * @return Array
	 */
	readContactsFromFile: function (file,format,encoding) {
		var retval = new Array();
		if (!file.isFile()) { return retval; }
		
		var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Components.interfaces.nsIFileInputStream);
		fStream.init(file,-1,0,0);
		switch (format) {
			case "vCardFile":
			case "vCardDir":
				//
				// a vCard ought to be read...
				//
				var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
				bStream.setInputStream(fStream);
				var datastr = bStream.readBytes(bStream.available());
				bStream.close();
				
				// interpret content of file and store result as Array
				retval = ThunderSyncVCardLib.interpretVCardString(datastr,encoding);
				
				break;
		}
		fStream.close();
		return retval;
	},
	
	/**
	 * Retrieve a contact's property from internal memory
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file ressource (part 2 of contact identifier)
	 * @param index index inside file ressource (part 3 of contact identifier)
	 * @param property name of property
	 * @param defaultValue default value, returned if property doesn't exist
	 * @return string value of property
	 */
	getProperty: function (abURI,path,index,property,defaultValue) {
		return this.CardDB[abURI][path][index].getProperty(property,defaultValue);
	},
	
	/**
	 * Define a new value for a contact's property in internal memory.
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file ressource (part 2 of contact identifier)
	 * @param index index inside file ressource (part 3 of contact identifier)
	 * @param property name of property
	 * @param value value of property
	 */
	setProperty: function (abURI,path,index,property,value) {
		this.CardDB[abURI][path][index].setProperty(property,value);
		var newValue = new Array(abURI,path);
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			if (this.ModDB[j] == newValue) { doPush = false; }
		}
		if (doPush) { this.ModDB.push(newValue);}
	},
	
	/**
	 * Mark contact as "to delete" in internal memory.
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file ressource (part 2 of contact identifier)
	 * @param index index inside file ressource (part 3 of contact identifier)
	 */
	deleteCard: function (abURI,path,index) {
		this.CardDB[abURI][path][index] = null;
		var newValue = new Array(abURI,path);
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			if (this.ModDB[j] == newValue) { doPush = false; }
		}
		if (doPush) { this.ModDB.push(newValue);}
	},
	
	/**
	 * Add contact to internal memory and mark it as "modified".
	 * Application: add local card to remote ressource.
	 * 
	 * Path may either point to a directory or a file.
	 * In case of a directory a unique file name is created.
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file ressource
	 * @param format file format string, e.g. "vCardDir" or "vCardFile"
	 * @param localCard contact to add
	 */
	addCard: function (abURI,path,format,localCard) {
		if (!(localCard instanceof Components.interfaces.nsIAbCard)) {
			return;
		}
		
		var ressource = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		ressource.initWithPath(path);
		ressource.QueryInterface(Components.interfaces.nsIFile);
		
		if (ressource.isFile()) {
			// entire addressbook is stored in card of cards:
			// simple: new path is filepath of addressbook vCard
			var newPath = path;
		}
		else { if (ressource.isDirectory()) {
			// addressbook stores contacts in single files:
			// create new unique file name
			var newPath = this.createFileName(
					format,
					dir,
					localCard.getProperty("UID","")
			);
		}}
		
		if (!this.CardDB[abURI]) {
			this.CardDB[abURI] = new Object();
		}
		if (!this.CardDB[abURI][newPath]) {
			this.CardDB[abURI][newPath] = new Array();
		}
		this.CardDB[abURI][newPath].push(localCard);
		
		var newValue = new Array(abURI,path);
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			if (this.ModDB[j] == newValue) { doPush = false; }
		}
		if (doPush) { this.ModDB.push(newValue);}
	}
	
				/*
Brainstorming...

We iterate over addressbooks, identified by URI and dirName (=displayed name).
For each addressbook, either a path or a file is given, containing contacts.
Problem: files that contain more than one contact; instead of contact-wise
         processing, we need a file-based writing process

1. read all contacts of a remote ressource and store in memory
2. compare, add to tree
3. sync: walk through tree, process changes in cards in memory
4. finally, write back every file containing modified contacts

data structure: Array/Object
CardDB[addressBookURI][filepath][index] = nsIAbCard

http://de.selfhtml.org/javascript/objekte/array.htm#assoziative_arrays

needed methods: (obsolete, implemented, but slightly different)
readContacts(path)
   clear CardDB
   if path = dir:
      iterate over files, add contacts to CardDB
   if path = file:
      read all cards from file and add to CardDB

modifyContact(URI,path,UID,Property,Value):
   this.CardDB[URI][path][UID][1].setProperty(Property,Value);
   this.CardDB[URI][path][UID][0] = true;

writeContacts()
   for each URI:
      for each path:
         doit=false;
         for each UID:
            doit |= this.CardDB[URI][path][UID][0];
         if doit:
            write this.CardDB[URI][path][*][1] to path
   clear CardDB

			*/

}
