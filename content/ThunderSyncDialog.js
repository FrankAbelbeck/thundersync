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
		mode constants as bitfields
	*/
	modeIgnore:     0x00, // 0000b
	modeFromLocal:  0x01, // 0001b
	modeFromRemote: 0x02, // 0010b
	modeUnequal:    0x04, // 0100b
	modeDelete:     0x08, // 1000b
	/*
		Unicode symbols for "mode" column 
	*/
	symbolModeFromLocal:    ">>",
	symbolModeFromRemote:   "<<",
	symbolModeUnequal:      "!=",
	symbolModeExchange:     "<>",
	
	/**
	 * Translates a mode constant into a Unicode symbol
	 *
	 * @param mode integer value
	 * @return mode character
	 */
	getModeSymbol: function (mode) {
		if (mode & this.modeFromLocal) {
			return this.symbolModeFromLocal;
		} else {
			if (mode & this.modeFromRemote) {
				return this.symbolModeFromRemote;
			}
		}
		return this.symbolModeUnequal;
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
		
		var mode = this.symbolModeExchange;
		var tmpmode = "";
		for (var i = 0; i < modeitems.length; i++) {
			tmpmode = modeitems[i].getAttribute("label");
			if (tmpmode == this.symbolModeUnequal) {
				mode = this.symbolModeUnequal;
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
		this.UIDDB       = new Object();
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
	 * @param toDelete mark entry as "to delete"
	 */
	addTreeItem: function (abURI,abName,localCard,path,index,differences,toDelete) {
		//
		// create display name for local contact. order of evaluation:
		// 1. DisplayName
		// 2. LastName, FirstName
		// 3. LastName
		// 4. FirstName
		// 5. primaryEmail
		// 6. UID
		//
		if ((localCard instanceof Components.interfaces.nsIAbCard) && !localCard.isMailList) {
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
			// contact is not a nsIAbCard or is a Mailing List:
			// set to empty strings
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
		if ((remoteCard instanceof Components.interfaces.nsIAbCard) && !remoteCard.isMailList) {
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
			// contact is not a nsIAbCard or is a Mailing List:
			// set to empty string
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
		// (automatically determined by display name comparison)
		//
		if (localDisplayName != "") {
			if (remoteDisplayName != "") {
				var mode = this.modeUnequal;
			} else {
				var mode = this.modeFromLocal;
			}
		} else {
			if (remoteDisplayName != "") {
				var mode = this.modeFromRemote;
			} else {
				var mode = this.modeUnequal;
			}
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
		cell.setAttribute("label",localDisplayName);
		if ((mode == this.modeFromLocal) && toDelete) {
			cell.setAttribute("properties","deleteItem");
		}
		cell.setAttribute("class","ThunderSyncDialog.treecell.local");
		cell.setAttribute("UID",localUID);
		row.appendChild(cell);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",this.getModeSymbol(mode));
		if (toDelete) {
			cell.setAttribute("properties","deleteItem");
		}
		cell.setAttribute("class","ThunderSyncDialog.treecell.mode");
		row.appendChild(cell);
		
		var cell = document.createElementNS(
			"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
			"treecell"
		);
		cell.setAttribute("label",remoteDisplayName);
		if ((mode == this.modeFromRemote) && toDelete) {
			cell.setAttribute("properties","deleteItem");
		}
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
			var stringsBundle = document.getElementById("ThunderSyncDialog.strings.dlg");
			
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
				if (differences[i][2] == (this.modeFromLocal | this.modeDelete)) {
					cell.setAttribute("properties","deleteItem");
				} else {
					if (differences[i][2] == this.modeFromRemote) {
						cell.setAttribute("properties","deleteItem");
					}
				}
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.local");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",this.getModeSymbol(differences[i][2]));
				if (differences[i][2] & this.modeDelete) {
					cell.setAttribute("properties","deleteItem");
				}
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.mode");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				cell.setAttribute("label",differences[i][1]);
				if (differences[i][2] == (this.modeFromRemote | this.modeDelete)) {
					cell.setAttribute("properties","deleteItem");
				} else {
					if (differences[i][2] == this.modeFromLocal) {
						cell.setAttribute("properties","deleteItem");
					}
				}
				cell.setAttribute("class","ThunderSyncDialog.treecell.property.remote");
				row.appendChild(cell);
				var cell = document.createElementNS(
					"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
					"treecell"
				);
				try {
					var proptype = stringsBundle.getString(differences[i][3]);
				} catch (exception) {
					var proptype = "";
				}
				cell.setAttribute("label",proptype);
				cell.setAttribute("value",differences[i][3]);
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
	 * @param filters object of associative array with filtered properties (filters[name]=value)
	 * @param syncMode override filters with this mode if == export|import|ignore|ask
	 * @return array of differences [value_card1,value_card2,mode,propertyname], compatible with addTreeItem()
	 */
	cardDifferences: function (card1,card2,filters,syncMode) {
		// create array of property names: all properties except photo
		var properties = ThunderSyncVCardLib.baseProperties.concat(ThunderSyncVCardLib.otherProperties);
		properties.push("Photo");
		var result = [];
		
		// compare these properties one by one and push (i.e. append)
		// differences to result array
		var mode = "";
		var prop1 = "";
		var prop2 = "";
		for (var i = 0; i < properties.length; i++) {
			// extract filter setting of this property (local sync mode)
			try {
				var propFilter = filters[properties[i]];
			} catch (exception) {
				var propFilter = null;
			}
			// 1. check if property should be ignored; in this case: skip iteration
			if (propFilter == "ignore") { continue; }
			// 2. process global syncMode
			switch (syncMode) {
				case "no":
					propFilter = "ignore";
					break;
				case "import":
				case "export":
					propFilter = syncMode;
					break;
				default:
					propFilter = null;
			}
			
			if (properties[i] != "Photo") {
				// process a normal property
				prop1 = card1.getProperty(properties[i],"");
				prop2 = card2.getProperty(properties[i],"");
				if (prop1 == 0) { prop1 = ""; }
				if (prop2 == 0) { prop2 = ""; }
			} else {
				// special routine for photos
				// prepare contact photo for comparison: if it's a file, read
				// contents and store them as string
				var photoname1 = card1.getProperty("PhotoName","");
				var phototype1 = card1.getProperty("PhotoType","");
				var prop1 = card1.getProperty("PhotoURI","");
				switch (phototype1) {
					case "generic":
						prop1 = "";
						break;
					case "file":
						prop1 = ThunderSyncVCardLib.readPhotoFromProfile(photoname1);
						break;
				}
				// prepare other contact photo for comparison: if it's a file,
				// read contents and store them as string
				var photoname2 = card2.getProperty("PhotoName","");
				var phototype2 = card2.getProperty("PhotoType","");
				var prop2 = card2.getProperty("PhotoURI","");
				switch (phototype2) {
					case "generic":
						prop2 = "";
						break;
					case "file":
						prop2 = ThunderSyncVCardLib.readPhotoFromProfile(photoname2);
						break;
				}
			}
			switch (propFilter) {
				case "export":
					// user just wants to export this property
					// default action: ">>"
					var mode = this.modeFromLocal;
					if (prop1 == prop2) {
						// no differences: ignore
						var mode = this.modeIgnore
					} else {
						if (prop1 == "") {
							// delete remote property
							var mode = this.modeFromRemote | this.modeDelete;
						}
					}
					break;
				case "import":
					// user just wants to import this property
					// default action: "<<"
					var mode = this.modeFromRemote;
					if (prop1 == prop2) {
						// no differences: ignore
						var mode = this.modeIgnore
					} else {
						if (prop2 == "") {
							// delete local property
							var mode = this.modeFromLocal | this.modeDelete;
						}
					}
					break;
				default:
					// interactive merge
					// default action: "!="
					var mode = this.modeUnequal;
					if (prop1 == prop2) {
						// no differences: ignore
						var mode = this.modeIgnore;
					} else {
						// ok, properties differ...
						if (prop1 == "") {
							// prop1 == "", prop1 != prop2, thus prop2 != ""
							var mode = this.modeFromRemote;
						} else {
							if (prop2 == "") {
								// prop1 != "" and prop2 == ""
								var mode = this.modeFromLocal;
							}
						}
					}
			}
			
			if (mode != this.modeIgnore) {
				if (properties[i] == "Photo") {
					var photoString = document.getElementById("ThunderSyncDialog.strings.dlg")
								.getString("Photo");
					if (prop1 != "") { prop1 = photoString; }
					if (prop2 != "") { prop2 = photoString; }
				}
				result.push([prop1,prop2,mode,properties[i]]);
			}
		}
		return result;
	},
	
	/**
	 * Perform a comparison of all specified addressbooks and store results
	 * in ThunderSync's dialog window as tree items.
	 *
	 * @param mode string, signaling "startUp", "shutdown" or otherwise normal operation
	 * @param autoclose boolean variable, if true: close dialog if no differences are found.
	 */
	compare: function () {
		var autoclose = false;
		var autoapply = true;
		var mode = null;
		try {
			// first try the wrappedJSObject trick for passing Javascript
			// objects between windows when no intial window is available
			// https://developer.mozilla.org/en-US/docs/Working_with_windows_in_chrome_code#Example_5.3A_Using_nsIWindowWatcher_for_passing_an_arbritrary_JavaScript_object
			mode = window.arguments[0].wrappedJSObject.mode;
			autoclose = true;
		} catch (exception) {
			// no wrappedJSObject trick: dialog is called without arguments
			// no mode defined: just normal interactive mode...
		}
		
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
		var stringsBundle = document.getElementById("ThunderSyncDialog.strings.dlg");
		
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
			var filterPrefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.ThunderSync.filter.");
			switch (mode) {
				case "startUp":
					var modePrefs = Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefService)
						.getBranch("extensions.ThunderSync.startUp.");
					break;
				case "shutdown":
					var modePrefs = Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefService)
						.getBranch("extensions.ThunderSync.shutdown.");
					break;
				default:
					var modePrefs = Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefService)
						.getBranch("extensions.ThunderSync.syncMode.");
			}
			// check number of preferences in each branch
			// if any equals 0, throw an exception
			var obj = new Array();
			var children = abPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = fmtPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = vcfExpEncPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = vcfImpEncPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = vcfHideUIDPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = vcfUseQPEPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = vcfDoFoldingPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = filterPrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
			var children = modePrefs.getChildList("",obj);  if (obj.value == 0) { throw "0"; }
		} catch (exception) {
			// error, not properly configured: inform user!
			promptService.alert(
				null,
				stringsBundle.getString("informationDialogTitle"),
				stringsBundle.getString("notProperlyConfiguredText")
			);
			if (autoclose) {
				document.getElementById("ThunderSync.dialog.sync").acceptDialog();
			}
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
		
		switch (mode) {
			case "dirSync":
			case "dirExport":
			case "dirImport":
			case "cardSync":
			case "cardExport":
			case "cardImport":
				// in case the user only wants to sync one addressbook
				// (by using the context menu), a custom directory iterator
				// has to be used; it is contained in the "arguments" parameter
				var allAddressBooks = window.arguments[0].wrappedJSObject.directories;
				if (allAddressBooks) { break; }
				// that should not have happened... falling through to default...
			default:
				// in any other case: work with all directories
				var allAddressBooks = abManager.directories;
		}
		
		while (allAddressBooks.hasMoreElements()) {
			// get next item in list; skip if it's not an addressbook
			var addressBook = allAddressBooks.getNext();
			if (!(addressBook instanceof Components.interfaces.nsIAbDirectory) || addressBook.isMailList) { continue; }
			// null pointer fix by gonter <https://github.com/gonter>
			// see https://github.com/gonter/ThunderSync-snap-mirror/commit/5a07fc6863d5c3c301cbedce966a57630f115cdc
			var abName = addressBook.fileName;
			if (abName == null) { continue; }
			abName = abName.replace(".mab","");
			
			// fetch desired path of addressbook from preferences
			// if this fails, no path was configured: skip addressbook
			try {
				var remoteResource = abPrefs.getCharPref(abName);
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
			
			// read addressbook-specific vCard preference: encode UID as Mozilla property?
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
			
			// read addressbook-specific filters preference
			filters = new Object();
			try {
				filterstr = filterPrefs.getCharPref(abName).split(",");
				for (var i=0; i<filterstr.length; i++) {
					[name,value] = filterstr[i].split("=");
					if (name.length > 0) {
						filters[name] = value;
					}
				}
			} catch (exception) {}
			
			// read addressbook-specific comparison mode: no, ask, export, import
			var syncMode = "no";
			switch (mode) {
				case "export":
				case "dirExport":
				case "cardExport":
					syncMode = "export";
					break;
				case "dirSync":
				case "cardSync":
					syncMode = "ask";
					break;
				case "import":
				case "dirImport":
				case "cardImport":
					var syncMode = "import";
					break;
				default:
					try {
						var syncMode = modePrefs.getCharPref(abName);
					} catch (exception) {
						var syncMode = "ask";
					}
			}
			
			// check if synchronisation is meant to be non-interactive
			switch (syncMode) {
				case "forced export":
					syncMode = "export"; // remove "forced "
					break;
				case "forced import":
					syncMode = "import"; // remove "forced "
					break;
				default:
					// at least one addressbook wants interaction during sync
					// thus, the global auto apply option is negated
					autoapply = false;
			}
			
			// no path defined or no sync desired? skip this addressbook...
			if ((remoteResource == "") || (syncMode == "no")) { continue; }
			
			// read all external contacts related to the current addressbook
			this.read(addressBook.URI,remoteResource);
			
			// process all or a subset of the contacts in the current addressbook
			if (mode == "cardSync" || mode == "cardExport" || mode == "cardImport") {
				// in case the user only wants to sync a few contacts
				// (by using the context menu), a custom card iterator
				// with selected entries has to be used
				var localCards = window.arguments[0].wrappedJSObject.cards;
			} else {
				// in any other case: iterate over all contacts...
				var localCards = addressBook.childCards;
			}
			
			while (localCards.hasMoreElements()) {
				var localCard = localCards.getNext();
				
				// catch undefined results or mailing list: skip...
				if (!(localCard instanceof Components.interfaces.nsIAbCard) || localCard.isMailList) { continue; }
				
				// try to find a match via UID
				var localUID = localCard.getProperty("UID","");
				if (localUID == "") {
					// undefined UID: create new one and apply changes
					localCard.setProperty("UID",uuidgenerator.generateUUID().toString().slice(1,37));
					addressBook.modifyCard(localCard);
				}
				
				var remoteCardAddr = this.UIDDB[addressBook.URI][localUID];
				
				if (remoteCardAddr == undefined) {
					//
					// no matching UID was found: search all remote contacts
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
					// iterate over remote contacts
					for (var path in this.CardDB[addressBook.URI]) {
						
						for (var i = 0; i < this.CardDB[addressBook.URI][path].length; i++) {
							// but skip already checked contacts...
							if (list_checked.indexOf([path,i].join("/")) >= 0) { continue; }
							// iterate over all properties set in local contact
							var properties = localCard.properties;
							while (properties.hasMoreElements()) {
								var property = properties.getNext();
								// need to unwrap xpconnect wrapped nsisupports!
								// query interface, i.e. transform into nsiproperty
								property.QueryInterface(Components.interfaces.nsIProperty);
								try {
									var value = this.getProperty(addressBook.URI,path,i,property.name,"");
								} catch (exception) { var value = ""; }
								if (property.value == value) { matches++; }
								total++;
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
								remoteCardAddr = [path,i];
							}
						}
					}
				}
				//
				// process results:
				//   if a remote contact was found: calculate differences
				//   if no contact was found: define a "from-local" tree item
				//
				
				if (remoteCardAddr != undefined) {
					// matching external contact found! Add to tree
					// local UID overwrites remote UID
					path = remoteCardAddr[0];
					i    = remoteCardAddr[1];
					this.setProperty(addressBook.URI,path,i,"UID",localUID);
					// interactive mode: compute differences
					// take syncMode into account
					var differences = this.cardDifferences(
						localCard,
						this.CardDB[addressBook.URI][path][i],
						filters,
						syncMode
					);
			
					if (differences.length > 0) {
						// differences found:
						// add entry: "local name" <--> "external name"
						this.addTreeItem(
							addressBook.URI,
							addressBook.dirName,
							localCard,
							path,
							i,
							differences,
							false
						);
					}
					// record path/index combination to prevent re-evaluation
					// of this contact
					list_checked.push(remoteCardAddr.join("/"));
				} else {
					// no match found, seems to be a new local contact
					//
					// add entry: "local name" --> ""
					// if we are in import mode:
					// mark local contact as "to delete" (last param = true)
					this.addTreeItem(
						addressBook.URI,
						addressBook.dirName,
						localCard,
						null,
						null,
						[],
						(syncMode == "import")
					);
				}
			}
			//
			// it remains to check if there are new external contacts
			// (but only if this not a card-specific sync)
			if (mode != "cardSync" && mode != "cardExport" && mode != "cardImport") {
				// iterate over remote contacts
				for (var path in this.CardDB[addressBook.URI]) {
					for (var i = 0; i < this.CardDB[addressBook.URI][path].length; i++) {
						// but skip already checked contacts...
						if (list_checked.indexOf([path,i].join("/")) >= 0 ) { continue; }
						if (this.getProperty(addressBook.URI,path,i,"UID","") == "") {
							// generate UID for contact
							this.setProperty(addressBook.URI,path,i,"UID",uuidgenerator.generateUUID().toString().slice(1,37));
						}
						// add entry: "" <-- "external name"
						// if we are in export mode:
						// mark remote contact as "to delete" (last param = true)
						this.addTreeItem(
							addressBook.URI,
							addressBook.dirName,
							null,
							path,
							i,
							[],
							(syncMode == "export")
						);
					}
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
			if (!autoclose) {
				promptService.alert(
					null,
					stringsBundle.getString("informationDialogTitle"),
					stringsBundle.getString("alreadySyncText")
				);
			}
			document.getElementById("ThunderSync.dialog.sync").acceptDialog();
		}
		else {
			// there are differences to sync:
			// enable synchronisation pushbutton
			this.checkIfSyncReady(autoapply);
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
			var selectedItem = tree.treeBoxObject.view.getItemAtIndex(tree.currentIndex);
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
			case this.symbolModeUnequal:
				//
				// move from "not equal" to "from local"
				//
				cell[0].removeAttribute("properties");
				cell[1].setAttribute("label",this.symbolModeFromLocal);
				cell[1].removeAttribute("properties");
				cell[2].setAttribute("properties","deleteItem");
				break;
			case this.symbolModeFromLocal:
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
					cell[1].setAttribute("label",this.symbolModeFromLocal);
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
						cell[1].setAttribute("label",this.symbolModeFromRemote);
						cell[1].removeAttribute("properties");
					}
				}
				break;
			case this.symbolModeFromRemote:
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
					cell[1].setAttribute("label",this.symbolModeFromRemote);
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
						cell[1].setAttribute("label",this.symbolModeFromLocal);
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
	 * 
	 * @param autoapply boolean parameter to indicate if the synchronisation
	 *                  should be carried out immediately if ready
	 */
	checkIfSyncReady: function (autoapply) {
		var properties =  document
			.getElementsByClassName("ThunderSyncDialog.treecell.property.mode");
		
		var unequal = false;
		for (var i = 0; i < properties.length; i++) {
			if (properties[i].getAttribute("label") == this.symbolModeUnequal) {
				unequal = true;
				break;
			}
		}
		document.getElementById("ThunderSyncDialog.button.sync").setAttribute("disabled",unequal.toString());
		if (!unequal && autoapply) {
			// no unequality sign detected and automatic synchronisation is requested:
			// call synchronisation function immediately
			ThunderSyncDialog.sync();
		}
		
	},
	
	/**
	 * Merge property of two contacts according to mode given in the tree.
	 *
	 * @param propType name of property
	 * @param propMode mode of merging: "from local" or "from remote"
	 * @param propDeleted boolean, true means "delete local" or "delete remote"
	 * @param localCard local contact (nsIAbCard)
	 * @param abURI related addressBook URI
	 * @param path path of remote contact resource
	 * @param index index of remote contact in this path
	 * @return integer indicating if local card (=1) or remote card (=2) was changed
	 */
	mergeProperties: function (propType,propMode,propDeleted,localCard,abURI,path,index) {
		var retval = 0;
		switch (propMode) {
			case this.symbolModeFromLocal:
				if (propDeleted) {
					// delete local property 
					localCard.setProperty(propType,"");
					retval = 1;
				}
				else {
					// create external property
					this.setProperty(abURI,path,index,
						propType,
						localCard.getProperty(propType,"")
					);
					retval = 2;
				}
				break;
			case this.symbolModeFromRemote:
				if (propDeleted) {
					// delete external property
					this.setProperty(abURI,path,index,propType,"");
					retval = 2;
				}
				else {
					// set local property
					localCard.setProperty(
						propType,
						this.getProperty(abURI,path,index,propType,"")
					);
					retval = 1;
				}
				break;
		}
		return retval;
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
		
		// delete file if it exists
		if (photoFile.exists() && photoFile.isFile()) {
			photoFile.remove(false);
		}
		
		// set properties to empty strings
		card.setProperty("PhotoName","");
		card.setProperty("PhotoType","");
		card.setProperty("PhotoURI","");
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
		
		// if it's an existing directory: process photo info
		if (photoDir.exists() && photoDir.isDirectory()) {
			// get data string from PhotoURI and determine file type and suffix
			var datastr = card.getProperty("PhotoURI","");
			var suffix = ThunderSyncVCardLib.determinePhotoSuffix(datastr.substr(0,8));
			var filename = "";
			
			// create a random number filename similar to the ones created by Thunderbird
			// control loop with a counter to avoid seemingly infinite loops
			var counter = 1024;
			do {
				filename = new String(Math.random()).replace("0.", "") + "." + suffix;
				var newImageFile = photoDir.clone();
				newImageFile.append(filename);
				counter--;
			} while (newImageFile.exists() && counter > 0);
			
			// if newImageFile doesn't exist: use it
			if (!newImageFile.exists()) {
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
			}
		}
	},
	
	/**
	 * Merge photo property of two contacts according to mode given in tree.
	 *
	 * @param propMode mode of merging: "from local" or "from remote"
	 * @param propDeleted boolean, true means "delete local" or "delete remote"
	 * @param localCard local contact (nsIAbCard)
	 * @param abURI related addressBook URI
	 * @param path path of remote contact resource
	 * @param index index of remote contact in this path
	 * @return integer indicating if local card (=1) or remote card (=2) was changed
	 */
	mergePhotoProperty: function (propMode,propDeleted,localCard,abURI,path,index) {
		var retval = 0;
		switch (propMode) {
			case this.symbolModeFromLocal:
				if (propDeleted) {
					// delete local property
					this.removePhotoFile(localCard);
					retval = 1;
				}
				else {
					// create external property
					this.setProperty(abURI,path,index,"PhotoName",localCard.getProperty("PhotoName",""));
					this.setProperty(abURI,path,index,"PhotoType",localCard.getProperty("PhotoType",""));
					this.setProperty(abURI,path,index,"PhotoURI", localCard.getProperty("PhotoURI",""));
					retval = 2;
				}
				break;
			case this.symbolModeFromRemote:
				if (propDeleted) {
					// delete external property
					this.setProperty(abURI,path,index,"PhotoName","");
					this.setProperty(abURI,path,index,"PhotoType","");
					this.setProperty(abURI,path,index,"PhotoURI","");
					retval = 2;
				}
				else {
					// set local property
					this.removePhotoFile(localCard);
					localCard.setProperty("PhotoName",this.getProperty(abURI,path,index,"PhotoName",""));
					localCard.setProperty("PhotoType",this.getProperty(abURI,path,index,"PhotoType",""));
					localCard.setProperty("PhotoURI", this.getProperty(abURI,path,index,"PhotoURI",""));
					this.processPhotoInformation(localCard);
					retval = 1;
				}
				break;
		}
		return retval;
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
			var photosToDelete = new Array();
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
					case this.symbolModeExchange:
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
						var side = 0;
						for (var j = 0; j < properties.length; j++) {
							var propType = properties[j]
								.getElementsByClassName("ThunderSyncDialog.treecell.property.type")[0]
								.getAttribute("value");
							
							var propModeCell = properties[j]
								.getElementsByClassName("ThunderSyncDialog.treecell.property.mode")[0];
							var propMode = propModeCell.getAttribute("label");
							var propDeleted = propModeCell.getAttribute("properties") == "deleteItem";
							
							if (propType != "Photo") {
								side = side | this.mergeProperties(propType,propMode,propDeleted,localCard,addressBook.URI,path,index);
							}
							else {
								side = side | this.mergePhotoProperty(propMode,propDeleted,localCard,addressBook.URI,path,index);
							}
						}
						// side: variable that tracks local/remote changes
						//  bit 0 set = at least one local change occured
						//  bit 1 set = at least one remote change occured
						if (side & 1) {
							// local side was modified: apply modification
							addressBook.modifyCard(localCard);
						}
						if (side & 2) {
							// remote side was modified: calculate revision, copy UID if needed
//							var rev = localCard.getProperty("LastModifiedDate",0);
							var rev = Date.parse(Date()) / 1000;
							this.setProperty(addressBook.URI,path,index,"LastModifiedDate",rev);
							if (remoteUID == "") {
								this.setProperty(addressBook.URI,path,index,"UID",localUID);
							}
						}
						break;
					
					case this.symbolModeFromLocal:
						//
						// local contact should be copied to external file
						//
						var localCard = addressBook.getCardFromProperty("UID",localUID,false);
						if (localCard == null) { break; }
						
						if (modeDeleted) {
							// delete local contact
							cardsToDelete.appendElement(localCard,false);
							var photoType = localCard.getProperty("PhotoType","");
							var photoName = localCard.getProperty("PhotoName","");
							if (photoType == "file" && photoName != "") {
								photosToDelete.push(photoName);
							}
						}
						else {
							// add new contact to CardDB
							this.addCard(
								addressBook.URI,
								abPrefs.getCharPref(addressBook.fileName.replace(".mab","")),
								format,
								localCard
							);
						}
						break;
						
					case this.symbolModeFromRemote:
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
				// important: delete any photos of these contacts, too!
				var photoDir = Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties)
						.get("ProfD", Components.interfaces.nsIFile);
				photoDir.append("Photos");
				if (photoDir.exists() && photoDir.isDirectory()) {
					for (var k=0; k<photosToDelete.length; k++) {
						var photoFile = photoDir.clone();
						photoFile.append(photosToDelete[k]);
						if (photoFile.exists() && photoFile.isFile()) {
							photoFile.remove(false);
						}
					}
				}
				
				// delete all marked contacts
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
	 * @return string constructed absolute path string (e.g. file://...)
	 */
	createFileName: function (format,dir,uid) {
		try {
			var directory = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService)
				.newURI(dir,null,null)
				.QueryInterface(Components.interfaces.nsIFileURL)
				.file;
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
		
		return Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService)
			.newFileURI(file).spec;
	},
	
	/**
	 * Write all modified contacts back to their external resources (and delete if necessary).
	 */
	write: function () {
		var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsIFile);
		var fStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
				.createInstance(Components.interfaces.nsIFileOutputStream);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
				.createInstance(Components.interfaces.nsIConverterOutputStream);
		
		var abURI = "";
		var path  = "";
		var dataString = "";
		// iterate over all modified contacts (including those to delete)
		for (i=0; i<this.ModDB.length; i++) {
			abURI = this.ModDB[i][0];
			path  = this.ModDB[i][1];
			dataString = "";
			// iterate over all contacts in given abURI/path combo
			for (k=0; k<this.CardDB[abURI][path].length; k++) {
				if ((this.CardDB[abURI][path][k] instanceof Components.interfaces.nsIAbCard) && !this.CardDB[abURI][path][k].isMailList) {
					// at least one contact exists: process contact
					switch (this.FormatDB[abURI]) {
						case "vCardDir":
						case "vCardFile":
							if (dataString.length > 0) { dataString += ThunderSyncVCardLib.CRLF; }
							dataString += ThunderSyncVCardLib.createVCardString(
								this.CardDB[abURI][path][k],
								this.ExpEncDB[abURI],
								this.HideUIDDB[abURI],
								this.UseQPEDB[abURI],
								this.DoFoldingDB[abURI]
							);
							break;
					}
				}
			}
			var file = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService)
					.newURI(path,null,null)
					.QueryInterface(Components.interfaces.nsIFileURL)
					.file;
			
			if (dataString.length > 0) {
				// file exists and is a regular file!
				// contacts were processed, so data should be written...
				switch (this.FormatDB[abURI]) {
					case "vCardDir":
					case "vCardFile":
						// initialise file stream object
						if (!file.exists()) { file.create(file.NORMAL_FILE_TYPE,0660); }
						fStream.init(file,0x02|0x08|0x20,0600,0);
						
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
								if ((this.CardDB[abURI][path][k] instanceof Components.interfaces.nsIAbCard) && !this.CardDB[abURI][path][k].isMailList) {
									if (dataString.length > 0) { dataString += ThunderSyncVCardLib.CRLF; }
									dataString += ThunderSyncVCardLib.createVCardString(
										this.CardDB[abURI][path][k],
										"UTF-8",
										this.HideUIDDB[abURI],
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
						fStream.close();
						break;
				}
			} else {
				// resource at abURI/path does not contain any contacts:
				// delete file...
				switch (this.FormatDB[abURI]) {
					case "vCardDir":
					case "vCardFile":
						try { file.remove(false); } catch (exception) {}
						break;
				}
			}
		}
	},
	
	/**
	 * Read all contacts from given file resource in given file format and
	 * store them in local memory; addressed via addressbook URI, path and index.
	 * 
	 * @param abURI URI of the corresponding addressbook
	 * @param path path to teh file resource
	 */
	read: function (abURI,path) {
		switch (this.FormatDB[abURI]) {
			case "vCardDir":
				this.readDir(abURI,path);
				break;
			case "vCardFile":
				this.readFile(abURI,path);
				break;
// 			case "vCardIMAP":
// 				this.readIMAP(abURI,path);
// 				break;
			default:
				return;
		}
	},
	
	readDir: function (abURI,path) {
		var resource = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService)
				.newURI(path,null,null)
				.QueryInterface(Components.interfaces.nsIFileURL)
				.file;
		
		// problem: if this.UIDDB[abURI] is not defined, then the access to
		// this.UIDDB[abURI][localUID] will fail, silently...
		// this leads to an empty comparison dialog and NO error message
		// thus empty objects are created to catch this one
		if (!this.UIDDB[abURI]) { this.UIDDB[abURI] = new Object(); }
		if (!this.CardDB[abURI]) { this.CardDB[abURI] = new Object();}
		
		if (resource.exists() && resource.isDirectory()) {
			var files = resource.directoryEntries;
			while (files.hasMoreElements()) {
				// get next item in list; skip if it's not a file object
				var file = files.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				if (file.isFile()) {
					var cards = this.readContactsFromFile(
							file,
							this.FormatDB[abURI],
							this.ImpEncDB[abURI]);
					var path = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService)
							.newFileURI(file).spec;
					if (cards.length > 0) {
						if (!this.CardDB[abURI][path]) { this.CardDB[abURI][path] = new Array(); }
						this.CardDB[abURI][path] = this.CardDB[abURI][path].concat(cards);
					}
					// record all defined UIDs
					for (var i=0; i < cards.length; i++) {
						var cardUID = cards[i].getProperty("UID","");
						if (cardUID != "") {
							this.UIDDB[abURI][cardUID] = [path,i];
						}
					}
				}
			}
		}
	},
	
	readFile: function (abURI,path) {
		var resource = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService)
				.newURI(path,null,null)
				.QueryInterface(Components.interfaces.nsIFileURL)
				.file;
		
		// problem: if this.UIDDB[abURI] is not defined, then the access to
		// this.UIDDB[abURI][localUID] will fail, silently...
		// this leads to an empty comparison dialog and NO error message
		// thus empty objects are created to catch this one
		if (!this.UIDDB[abURI]) { this.UIDDB[abURI] = new Object(); }
		if (!this.CardDB[abURI]) { this.CardDB[abURI] = new Object();}
		
		if (resource.exists() && resource.isFile()) {
			var cards = this.readContactsFromFile(
					resource,
					this.FormatDB[abURI],
					this.ImpEncDB[abURI]);
			
			if (cards.length > 0) {
				if (!this.CardDB[abURI][path]) { this.CardDB[abURI][path] = new Array(); }
				this.CardDB[abURI][path] = this.CardDB[abURI][path].concat(cards);
			}
			// record all defined UIDs
			for (var i=0; i < cards.length; i++) {
				var cardUID = cards[i].getProperty("UID","");
				if (cardUID != "") { 
					this.UIDDB[abURI][cardUID] = [path,i];
				}
			}
		}
	},
	
	/**
	 * Write a message to Thunderbird's error console
	 * 
	 * @param msg message string
	 */
	logMsg: function (msg) {
		Components.classes["@mozilla.org/consoleservice;1"]
			.getService(Components.interfaces.nsIConsoleService)
			.logStringMessage("[ThunderSync/MainDialog] "+msg);
	},

	/**
	 * Extract all contacts in given format from a given file resource.
	 *
	 * An Array will be returned, consisting of all extracted nsIAbCards:
	 *    (nsIAbCard, nsIAbCard, ...)
	 * 
	 * If file points to an unknown resource or a directory,
	 * an empty array is returned.
	 * 
	 * @param fileResource  nsIFile object, remote resource file
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
	 * Checks whether a given file represents a contact of given format
	 * 
	 * @return boolean
	 */
	fileIsContact: function (file,format) {
		var retval = false;
		if (!file.isFile()) { return retval; }
		
		var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Components.interfaces.nsIFileInputStream);
		fStream.init(file,-1,0,0);
		switch (format) {
			case "vCardFile":
			case "vCardDir":
				// read first 64 characters of a vCard
				// if they contain "BEGIN:VCARD" then it is
				// a valid contact file
				var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
				bStream.setInputStream(fStream);
				var datastr = bStream.readBytes(64);
				bStream.close();
				retval = (datastr.indexOf("BEGIN:VCARD") != -1)
				break;
		}
		fStream.close();
		return retval;
	},
	
	/**
	 * Retrieve a contact's property from internal memory
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file resource (part 2 of contact identifier)
	 * @param index index inside file resource (part 3 of contact identifier)
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
	 * @param path path to file resource (part 2 of contact identifier)
	 * @param index index inside file resource (part 3 of contact identifier)
	 * @param property name of property
	 * @param value value of property
	 */
	setProperty: function (abURI,path,index,property,value) {
		// set card's property 
		this.CardDB[abURI][path][index].setProperty(property,value);
		// register card, addressed by abURI and path
		// 1. iterate over all entries of ModDB
		var newValue = new Array(abURI,path);
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			if (this.ModDB[j][0] == newValue[0] && this.ModDB[j][1] == newValue[1]) {
				doPush = false;
				continue;
			}
		}
		// 2. if no entry was found: add it
		if (doPush) { this.ModDB.push(newValue);}
	},
	
	/**
	 * Mark contact as "to delete" in internal memory.
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file resource (part 2 of contact identifier)
	 * @param index index inside file resource (part 3 of contact identifier)
	 */
	deleteCard: function (abURI,path,index) {
		// delete in memory: set to null
		this.CardDB[abURI][path][index] = null;
		// analyse modification DB...
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			// ...if [abURI,path] is already registered,
			// avoid registering it another time
			if ((this.ModDB[j][0] == abURI) && (this.ModDB[j][1] == path)) {
				doPush = false;
				continue;
			}
		}
		// not found: append it to modification DB
		if (doPush) {
			this.ModDB.push([abURI,path]);
		}
	},
	
	/**
	 * Add contact to internal memory and mark it as "modified".
	 * Application: add local card to remote resource.
	 * 
	 * Path may either point to a directory or a file.
	 * In case of a directory a unique file name is created.
	 * 
	 * @param abURI URI of the addressbook (part 1 of contact identifier)
	 * @param path path to file resource
	 * @param format file format string, e.g. "vCardDir" or "vCardFile"
	 * @param localCard contact to add
	 */
	addCard: function (abURI,path,format,localCard) {
		if (!(localCard instanceof Components.interfaces.nsIAbCard) || localCard.isMailList) {
			return;
		}
		
		switch (format) {
			case "vCardDir":
				// addressbook stores contacts in single files:
				// create new unique file name
				var newPath = this.createFileName(
						format,
						path,
						localCard.getProperty("UID","")
				);
				break;
			case "vCardFile":
				// entire addressbook is stored in card of cards:
				// simple: new path is filepath of addressbook vCard
				var newPath = path;
				break;
// 			case "vCardIMAP":
// 				break;
			default:
				return;
		}
		
		if (!this.CardDB[abURI]) {
			this.CardDB[abURI] = new Object();
		}
		if (!this.CardDB[abURI][newPath]) {
			this.CardDB[abURI][newPath] = new Array();
		}
		this.CardDB[abURI][newPath].push(localCard);
		
		// register card, addressed by abURI and path
		// 1. iterate over all entries of ModDB
		var newValue = new Array(abURI,newPath);
		var doPush = true;
		for (j=0; j<this.ModDB.length; j++) {
			if (this.ModDB[j][0] == newValue[0] && this.ModDB[j][1] == newValue[1]) {
				doPush = false; 
				continue;
			}
		}
		// 2. if no entry was found: add it
		if (doPush) { this.ModDB.push(newValue);}
	}

}
