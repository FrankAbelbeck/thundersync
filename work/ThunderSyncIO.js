/**
 * I/O logic for ThunderSync
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

var ThunderSyncIO = {
	
	//
	// purpose of this object:
	//  - central management of file I/O
	//  - central storage of external contact ressources as nsIAbCards
	//
	
	//
	// list of stored cards: associative array implemented as object
	//
	var cardList = {
		
	}
	
	/**
	 * Read from an external ressource and store contacts as nsIAbCard(s).
	 * 
	 * path might point either to a file or a directory. Subdirectories
	 * are ignored to avoid recursion and to reduce complexity.
	 * 
	 * @param path directory or file to be read from
	 */
	read: function (path) {
	},
	
	/**
	 * Write all stored nsIAbCards to the designated external ressources.
	 * 
	 * Actually, file I/O is only executed if at least one contact
	 * associated with any given path was modified.
	 * 
	 */
	write: function () {
	},
	
	/**
	 * Get contact associated with given UID.
	 * 
	 * @param uid unique identifier
	 * @return Array all nsIAbCards associated with path
	 */
	
	get: function (uid) {
	},
	
	/**
	 * Store contact card internally; if contact does not have a UID,
	 * it will be created. Returns the UID of the processed card.
	 * 
	 * @param card nsIAbCard to store
	 * @return string UID of stored card
	 */
	set: function (card) {
	},
	
	/**
	 * Remove contact with given UID. Files will be deleted when the
	 * write function is called; i.e. the remove op is enqueued.
	 * 
	 * @param uid unique identifier
	 */
	remove: function (uid) {
	}
}
	
	
	
	
	
	
	
	
	
	
	
	/**
	 * Write a nsIAbCard or a nsIAbDirectory to a file of given format at given path using
	 * given character encoding.
	 *
	 * @param contactRessource nsIAbCard or nsIAbDirectory which has to be written
	 * @param format file format string, e.g. "vcard"
	 * @param filePath nsIFile object pointing to target file path
	 */
	WriteContactToFile: function (contactRessource,format,filePath) {
		var fStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Components.interfaces.nsIConverterOutputStream);
		
		fStream.init(filePath,0x02|0x08|0x20,0600,0);
		switch (format) {
			case "vcard":
				//
				// a vCard ought to be written...
				//
				// fix Outlook's non-standard behaviour:
				// apply a different encoding chosen by the user
				var encoding = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefService)
					.getBranch("extensions.ThunderSync.")
					.getCharPref("exportEncoding");
				if (encoding == "Standard") { encoding = "UTF-8"; }
				converter.init(fStream, encoding, 0, 0);
				try {
					if (contactRessource instance Components.interfaces.nsIAbCard) {
						converter.writeString(
							ThunderSyncVCardLib.createVCardString(
								contactRessource,
								encoding
							)
						);
					} else {
						if (contactRessource instance Components.interfaces.nsIAbDirectory) {
							var cards = contactRessource.childCards;
							while (cards.hasMoreElements()) {
								var card = cards.getNext();
								if (!(card instanceof Components.interfaces.nsIAbCard)) { continue; }
								converter.writeString(
									ThunderSyncVCardLib.createVCardString(
										card,
										encoding
									)
								);
							}
						}
					}
				}
				catch (exception) {
					// user defined encoding did not work:
					// fall back to Unicode
					converter.init(fStream, "UTF-8", 0, 0);
					try {
						if (contactRessource instance Components.interfaces.nsIAbCard) {
							converter.writeString(
								ThunderSyncVCardLib.createVCardString(
									contactRessource,
									"UTF-8"
								)
							);
						} else {
							if (contactRessource instance Components.interfaces.nsIAbDirectory) {
								var cards = contactRessource.childCards;
								while (cards.hasMoreElements()) {
									var card = cards.getNext();
									if (!(card instanceof Components.interfaces.nsIAbCard)) { continue; }
									converter.writeString(
										ThunderSyncVCardLib.createVCardString(
											card,
											"UTF-8"
										)
									);
								}
							}
						}
					}
					catch (exception) {
						// neither custom encoding
						// nor Unicode works: ignore
					}
				}
				converter.close();
				break;
		}
		fStream.close();
	},
	
	/**
	 * Extract all contacts in given format from a given file ressource.
	 *
	 * fileRessource can point either to a regular file or a directory.
	 * In the latter case this function iterates over all files in the
	 * directory.
	 * 
	 * Either way, an Array will be returned, consisting of sub-arrays which
	 * in turn contain a path and all corresponding nsIAbCards:
	 *    (
	 *       (path, nsIAbCard),
	 *       (path, nsIAbCard, nsIAbCard),
	 *       ...
	 *    )
	 * 
	 * Subdirectories are ignored to avoid recursion and to reduce complexity.
	 * 
	 * @param fileRessource  nsIFile object, remote ressource (file|dir)
	 * @param format file format string, e.g. "vcard"
	 * @return Array
	 */
	ReadContactsFromFileRessource: function (fileRessource,format) {
		var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
				.createInstance(Components.interfaces.nsIAbCard);
		var retval = new Array();
		
		file.QueryInterface(Components.interfaces.nsIFile);
		if (file.isFile()) {
			retval.push(this.ReadContactsFromFile(fileRessource,format));
		}
		else { if (file.isDirectory()) {
			var files = file.directoryEntries;
			while (files.hasMoreElements()) {
				// get next item in list; skip if it's not a file object
				var file = files.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				if (file.isFile()) {
					var cards = this.ReadContactsFromFile(file,format);
					if (cards.length > 0) { retval.push(cards); }
				}
			}
		}}
		return retval;
	},
	
	/**
	 * Extract all contacts in given format from a given file ressource.
	 *
	 * fileRessource can point either to a regular file or a directory.
	 * In the latter case this function iterates over all files in the
	 * directory.
	 * 
	 * Either way, an Array will be returned, consisting of the file's path
	 * as well as all extracted nsIAbCards:
	 *    (path, nsIAbCard, nsIAbCard, ...)
	 * 
	 * If file points to an unknown ressource, an empty array is returned.
	 * 
	 * @param fileRessource  nsIFile object, remote ressource (file|dir)
	 * @param format file format string, e.g. "vcard"
	 * @return Array
	 */
	ReadContactsFromFile: function (file,format) {
		var retval = new Array();
		if (!file.isFile()) { return retval; }
		
		var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Components.interfaces.nsIFileInputStream);
		fStream.init(file,-1,0,0);
		switch (format) {
			case "vcard":
				//
				// a vCard ought to be read...
				//
				var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
				bStream.setInputStream(fStream);
				var datastr = bStream.readBytes(bStream.available());
				bStream.close();
				
				// fix Outlook's non-standard behaviour:
				// apply a different encoding chosen by the user
				var encoding = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefService)
					.getBranch("extensions.ThunderSync.")
					.getCharPref("importEncoding");
				if (encoding == "Standard") { encoding = "ISO-8859-1"; }
				
				// split data string into separate vCards
				// this takes care of vCards carrying vCards
				var cardstr = datastr.split("END:VCARD");
				for (i = 0; i < cardstr.length-1; i++) {
					// interpret individual strings (stripped of leading or
					// trailing line breaks; reconstructed END tag)
					card = this.interpretVCardString(
						cardstr[i].replace(/^[\r\n]*/,"").replace(/[\r\n]*$/,"\r\n").concat("END:VCARD"),
						encoding
					);
					// if interpretation leads indeed to a nsIAbCard, add to array
					if (card instanceof Components.interfaces.nsIAbCard) {
						retval.push(card);
					}
				}
				break;
		}
		fStream.close();
		// if array is empty, file points to an unknown ressource
		// otherwise, at least one contact was extracted and thus the path
		// can be associated with this array
		if (retval.length > 0) { retval = Array(file.path).concat(retval); }
		return retval;
	},
	
	

	


	
		/**
	 * Read the UIDs from an external contact file.
	 *
	 * Since v2 this function returns an array because a contact file might
	 * contain more than one contact.
	 * 
	 * @param file nsIFile object
	 * @param format file format string, e.g. "vcard"
	 * @return array with UID strings, empty strings if not found
	 */
	readUID: function (file,format) {
		var uids = new Array();
		var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
 		fStream.init(file,-1,0,0);
		switch (format) {
			case "vcard":
				var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
				bStream.setInputStream(fStream);
				var datastr = bStream.readBytes(bStream.available());
				bStream.close();
				
				var cards = datastr.split("END:VCARD")
				for (i = 0; i < cards.length-1; i++) {
					uids.push(
						ThunderSyncVCardLib.readUID(
							cards[i].replace(/^[\r\n]*/,"").replace(/[\r\n]*$/,"\r\n").concat("END:VCARD")
						)
					);
				}
				break;
		}
		fStream.close();
		return uids;
	},
	
