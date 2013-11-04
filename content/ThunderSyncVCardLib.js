/**
 * vCard library for ThunderSync according to vCard version 2.1
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

var ThunderSyncVCardLib = {
	
	// default file suffix
	suffix: "vcf",
	
	// vCard standard newline sequence
	CRLF: String.fromCharCode(13,10),
	
	// dictionary, mapping an image file suffix to a vCard image file type
	PhotoSuffixToType: {
		GIF:"GIF",
		PNG:"PNG",
		JPG:"JPEG",
		JPEG:"JPEG",
		JPE:"JPEG",
		JIF:"JPEG",
		JFIF:"JPEG",
		JFI:"JPEG",
		TIFF:"TIFF",
		TIF:"TIFF",
		BMP:"BMP",
		DIP:"BMP",
		PDF:"PDF",
		PS:"PS"
	},
	
	// dictionary, mapping a vCard image file type to an image file suffix
	PhotoTypeToSuffix: {
		GIF:"GIF",
		PNG:"PNG",
		JPEG:"JPG",
		TIFF:"TIF",
		BMP:"BMP",
		PDF:"PDF",
		PS:"PS"
	},
	
	// list of properties stored as native vCard properties
	// LastModifiedDate is not added because we calculate it at every sync
	baseProperties: new Array(
// 		"LastModifiedDate",
		"LastName", "FirstName",
 		"DisplayName",
		"PrimaryEmail", "SecondEmail",
		"HomeAddress", "HomeAddress2", "HomeCity", "HomeState",
		"HomeZipCode", "HomeCountry",
		"WorkAddress", "WorkAddress2", "WorkCity", "WorkState",
		"WorkZipCode", "WorkCountry",
		"HomePhone", "WorkPhone", "FaxNumber", "CellularNumber", "PagerNumber",
		"JobTitle", "Department", "Company", "WebPage1", "WebPage2",
		"BirthYear", "BirthMonth", "BirthDay", "Notes",
		"_AimScreenName",
		"_GoogleTalk", "_Yahoo", "_Skype", "_MSN", "_ICQ", "_JabberId" // new since 2012?
	),
	
	// list of photo properties
	photoProperties: new Array("PhotoName", "PhotoType", "PhotoURI"),
	
	// list of string properties stored as X-MOZILLA-PROPERTY
	otherProperties: new Array(
		"NickName", "PhoneticFirstName", "PhoneticLastName",
		"SpouseName", "FamilyName",
		"HomePhoneType", "WorkPhoneType", "FaxNumberType",
		"PagerNumberType", "CellularNumberType",
		"PopularityIndex", "PreferMailFormat", // int
		"AllowRemoteContent", // bool
		"Custom1", "Custom2", "Custom3", "Custom4",	// base64?
		"_QQ", "_IRC", // new since 2012?
		"AnniversaryYear", "AnniversaryMonth", "AnniversaryDay"
	),
	
	allProperties: function () {
		return this.baseProperties.concat(this.photoProperties).concat(this.otherProperties);
	},
	
	/**
	 * Analyse unencoded binary string and determine image file format.
	 *
	 * @param datastr string of binary data
	 * @return file extension or "" when unknown
	 */
	determinePhotoSuffix: function (datastr) {
		if (datastr.substr(0,4) == String.fromCharCode(0x47,0x49,0x46,0x38)) {
			return "gif";
		}
		if (datastr.substr(0,8) == String.fromCharCode(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A)) {
			return "png";
		}
		if (datastr.substr(0,2) == String.fromCharCode(0xFF,0xD8)) {
			return "jpg";
		}
		if (datastr.substr(0,4) == String.fromCharCode(0x49,0x49,0x2A,0x00)
			|| datastr.substr(0,4) == String.fromCharCode(0x4D,0x4D,0x00,0x2A)) {
			return "tiff";
		}
		if (datastr.substr(0,2) == String.fromCharCode(0x42,0x4D)) {
			return "bmp";
		}
		if (datastr.substr(0,2) == String.fromCharCode(0x25,0x50,0x44,0x46)) {
			return "pdf";
		}
		if (datastr.substr(0,2) == String.fromCharCode(0x25,0x21)) {
			return "ps";
		}
		return ""
	},
	
	/**
	 * Decodes a quoted-printable string. Assumes that soft line breaks
	 * are already removed.
	 * 
	 * @param encstr quoted-printable encoded string
	 * @return decoded string
	 */
	fromQuotedPrintable: function (encstr) {
		//
		// for each character in encstr: if it is an equal sign,
		// use the following two characters as hex char code; otherwise
		// just copy to output string
		//
		var datastr = "";
		var i = 0;
		while (i < encstr.length) {
			if (encstr[i] == "=") {
				datastr += String.fromCharCode(Number("0x" + encstr[i+1] + encstr[i+2]));
				i += 3;
			}
			else {
				datastr += encstr[i];
				i++;
			}
		}
		return datastr;
	},
	
	/**
	 * Encodes a quoted-printable string. No soft line breaks are added.
	 * 
	 * @param datastr source string
	 * @return encoded string
	 */
	toQuotedPrintable: function (datastr) {
		//
		// for each character in datastr: if char code is out of
		// printable range, encode it as =XX with XX as hex char code;
		// otherwise just copy the character
		//
		var encstr = "";
		var i = 0;
		while (i < datastr.length) {
			var charcode = datastr.charCodeAt(i);
			if (charcode < 32 || charcode > 126 || charcode == 61) {
				if (charcode > 15) {
					encstr += "=" + charcode.toString(16).toUpperCase();
				}
				else {
					encstr += "=0" + charcode.toString(16).toUpperCase();
				}
			}
			else {
				encstr += datastr[i];
			}
			i++;
		}
		return encstr;
	},
	
	/**
	 * Insert soft line break "=\r\n " into quoted printable encoded data
	 * to limit line length.
	 *
	 * @param datastr original quoted-printable data string
	 * @param offset start position of first line (0-76)
	 * @return folded quoted printable data string
	 */
	foldQuotedPrintable: function (datastr,offset) {
 		var pos = 75 - offset;
		var foldedstr = "";
		while (datastr.length > 0) {
			foldedstr += datastr.substr(0,pos);
			datastr = datastr.substr(pos);
			if (datastr.length > 0) { foldedstr += "=" + this.CRLF; }
			pos = 75;
		}
		return foldedstr;
	},
	
	/**
	 * Opens given file in Thunderbird profile Photos directory and
	 * encodes contents as base64 string.
	 *
	 * @param photoname filename of photo
	 * @return base64-encoded data string
	 */
	readPhotoFromProfile: function (photoname) {
		var filename = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		filename.append("Photos");
		filename.append(photoname);
		if (filename.exists() && filename.isFile()) {
			var fileuri = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService)
				.newFileURI(filename);
			if (fileuri && fileuri.schemeIs("file")) {
				try {
					var fileio = Components.classes["@mozilla.org/network/file-input-stream;1"]
						.createInstance(Components.interfaces.nsIFileInputStream);
					fileio.init(filename,-1,-1,false);  
					var binaryio = Components.classes["@mozilla.org/binaryinputstream;1"]
						.createInstance(Components.interfaces.nsIBinaryInputStream);
					binaryio.setInputStream(fileio);
					return binaryio.readBytes(binaryio.available());
				}
				catch (exception) { }
			}
		}
		return "";
	},
	
	/**
	 * Insert soft line break "\r\n " into base64 data to limit line length.
	 *
	 * @param datastr original base64 data string
	 * @param offset start position of first line (0-76)
	 * @return folded base 64 data string
	 */
	foldBase64: function (datastr,offset) {
		var pos = 76-offset;
		var foldedstr = datastr.substr(0,pos)
		datastr = datastr.substr(pos)
		if (datastr.length > 0) { foldedstr += this.CRLF + " " };
		while (datastr.length > 0) {
			foldedstr += datastr.substr(0,75);
			datastr = datastr.substr(75)
			if (datastr.length > 0) { foldedstr += this.CRLF + " " };
		}
		return foldedstr;
	},
	
	/**
	 * Insert soft line break "\r\n " at word boundaries to limit line length.
	 *
	 * @param textstr original string
	 * @return folded string
	 */
	foldText: function (textstr) {
		foldedstr = "";
		while (textstr.length > 76) {
			var pos = 75;
			while (("\f\n\t\v ".indexOf(textstr.charAt(pos)) == -1) && (pos >= 0)) { pos--; }
			foldedstr += textstr.substr(0,pos) + this.CRLF;
			textstr = textstr.substr(pos)
		}
		foldedstr += textstr;		
		return foldedstr;
	},
	
	/**
	 * Converts an addressbook contact ("card") to a vCard string.
	 * Properties which cannot be mapped to vCard properties are
	 * encoded as X-MOZILLA-PROPERTY:PropertyName;PropertyValue.
	 *
	 * Standard charset of vCards is ASCII. If non-ASCII characters are
	 * encountered, charset UTF-8 is set.
	 *
	 * @param card nsIAbCard
	 * @param charset
	 * @param hideUID
	 * @param useQPE
	 * @param doFolding
	 * @return ASCII string with vCard content
	 */
	createVCardString: function (card,charset,hideUID,useQPE,doFolding) {
		//
		// prepare charset converter and set it to given charset
		//
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = charset;
		//
		// helper function to add leading zero for values smaller 10
		//
		function zeropad(n){return n<10 ? '0'+n : n}
		//
		// start a new vCard with the BEGIN property
		//
		var vcfstr = "BEGIN:VCARD" + this.CRLF + "VERSION:2.1" + this.CRLF;
		var lastname = "";
		var firstname = "";
		var rev = 0;
		var revdate = new Date();
		var homeAdr = ["","","","","",""];
		var workAdr = ["","","","","",""];
		var department = "";
		var company = "";
		var year = "";
		var month = "";
		var day = "";
		var photoURI = "";
		var photoType = "";
		var photoName = "";
		var value = "";
		var tmpstr = "";
		var photoStr = "";
		var photoData = "";
		var suffice = "";
		//
		// 2013-06-05: iterate over properties instead of checking every property
		//
		
		var properties = card.properties;
		while (properties.hasMoreElements()) {
			property = properties.getNext();
			// need to unwrap xpconnect wrapped nsisupports!
			// query interface, i.e. transform into nsiproperty
			property.QueryInterface(Components.interfaces.nsIProperty);
			
// 			this.logMsg(property.name + " = " + property.value);
			
			switch (property.name) {
				//
				// revision ("last modified date")
				//
				case "LastModifiedDate":
					try {
						rev = String(property.value);
						if (rev > 0) {
							revdate.setTime(rev*1000)
							vcfstr += "REV:"
								+ revdate.getUTCFullYear() + "-"
								+ zeropad(revdate.getUTCMonth()+1) + "-"
								+ zeropad(revdate.getUTCDate())    + "T"
								+ zeropad(revdate.getUTCHours())   + ":"
								+ zeropad(revdate.getUTCMinutes()) + ":"
								+ zeropad(revdate.getUTCSeconds()) + "Z"
								+ this.CRLF;
						}
					}
					catch (exception) {}
					break;
				//
				// name: LastName,FirstName
				// (compound property value, semicolons have to be escaped)
				//
				case "LastName":
					lastname = String(property.value).replace(/;/g,"\\;");
					break;
				case "FirstName":
					firstname = String(property.value).replace(/;/g,"\\;");
					break;
				//
				// display name
				//
				case "DisplayName":
					value = String(property.value);
					if (value != "") { vcfstr += "FN;CHARSET="+charset+":" + value + this.CRLF; }
					break;
				//
				// UID
				//
				case "UID":
					value = String(property.value);
					if (value != "") {
						vcfstr += "UID:" + value + this.CRLF;
						if (hideUID) { vcfstr += "X-MOZILLA-PROPERTY:UID;" + value + this.CRLF; }
					}
					break;
				//
				// e-mail
				//
				case "PrimaryEmail":
					value = String(property.value);
					if (value != "") { vcfstr += "EMAIL;TYPE=INTERNET;PRIMARY:" + value + this.CRLF; }
					break;
				
				case "SecondEmail":
					value = String(property.value);
					if (value != "") { vcfstr += "EMAIL;TYPE=INTERNET;SECONDARY:" + value + this.CRLF; }
					break;
				//
				// home address
				//
				case "HomeAddress2":
					homeAdr[0] = String(property.value).replace(/;/g,"\\;");
					break;
				case "HomeAddress":
					homeAdr[1] = String(property.value).replace(/;/g,"\\;");
					break;
				case "HomeCity":
					homeAdr[2] = String(property.value).replace(/;/g,"\\;");
					break;
				case "HomeState":
					homeAdr[3] = String(property.value).replace(/;/g,"\\;");
					break;
				case "HomeZipCode":
					homeAdr[4] = String(property.value).replace(/;/g,"\\;");
					break;
				case "HomeCountry":
					homeAdr[5] = String(property.value).replace(/;/g,"\\;");
					break;
				//
				// work address
				//
				case "WorkAddress2":
					workAdr[0] = String(property.value).replace(/;/g,"\\;");
					break;
				case "WorkAddress":
					workAdr[1] = String(property.value).replace(/;/g,"\\;");
					break;
				case "WorkCity":
					workAdr[2] = String(property.value).replace(/;/g,"\\;");
					break;
				case "WorkState":
					workAdr[3] = String(property.value).replace(/;/g,"\\;");
					break;
				case "WorkZipCode":
					workAdr[4] = String(property.value).replace(/;/g,"\\;");
					break;
				case "WorkCountry":
					workAdr[5] = String(property.value).replace(/;/g,"\\;");
					break;
				//
				// phone number, home/work/fax/cell
				//
				case "HomePhone":
					value = String(property.value);
					if (value != "") { vcfstr += "TEL;HOME;VOICE:" + value + this.CRLF; }
					break;
				case "WorkPhone":
					value = String(property.value);
					if (value != "") { vcfstr += "TEL;WORK;VOICE:" + value + this.CRLF; }
					break;
				case "FaxNumber":
					value = String(property.value);
					if (value != "") { vcfstr += "TEL;FAX:" + value + this.CRLF; }
					break;
				case "CellularNumber":
					value = String(property.value);
					if (value != "") { vcfstr += "TEL;CELL:" + value + this.CRLF; }
					break;
				case "PagerNumber":
					value = String(property.value);
					if (value != "") { vcfstr += "TEL;PAGER:" + value + this.CRLF; }
					break;
				//
				// job title
				//
				case "JobTitle":
					value = String(property.value);
					if (value != "") { vcfstr += "TITLE;CHARSET="+charset+":" + value + this.CRLF; }
					break;
				//
				// department
				//
				case "Department":
					department = String(property.value).replace(/;/g,"\\;");
					break;
				case "Company":
					company = String(property.value).replace(/;/g,"\\;");
					break;
				//
				// webpages
				//
				case "WebPage1":
					value = String(property.value);
					if (value != "") { vcfstr += "URL;TYPE=WORK:" + value + this.CRLF; }
					break;
				case "WebPage2":
					value = String(property.value);
					if (value != "") { vcfstr += "URL;TYPE=HOME:" + value + this.CRLF; }
					break;
				//
				// birthday
				//
				case "BirthYear":
					year = String(property.value);
					break;
				case "BirthMonth":
					month = String(property.value);
					break;
				case "BirthDay":
					day = String(property.value);
					break;
				//
				// notes; single value of a contact which might hold a line
				// break and might create a rather long line if not folded
				//
				case "Notes":
					value = String(property.value);
					if (value != "") {
						if (value.indexOf("\n") != -1) {
							// at least one line break is present: encoding needed
							if (useQPE) {
								// the user allows quoted printable: use it
								tmpstr = "NOTE;CHARSET=" + charset + ";ENCODING=QUOTED-PRINTABLE:";
								if (doFolding) {
									// ...and folding is allowed, too!
									vcfstr += tmpstr + this.foldQuotedPrintable(
											this.toQuotedPrintable(value),
											tmpstr.length
										) + this.CRLF;
								} else {
									// ...but don't fold the line
									vcfstr += tmpstr
										+ this.toQuotedPrintable(value)
										+ this.CRLF;
								}
							} else {
								// fall back to base64 encoding
								tmpstr = "NOTE;CHARSET=" + charset + ";ENCODING=BASE64:"
								if (doFolding) {
									// ...and folding is allowed, too!
									vcfstr += tmpstr + this.foldBase64(
											window.btoa(value),
											tmpstr.length
										) + this.CRLF + this.CRLF;
								} else {
									// ...but don't fold the line
									vcfstr += tmpstr + window.btoa(value) + this.CRLF;
								}
							}
						} else {
							// encoding not needed
							if (doFolding) {
								// ...but we are allowed to fold it!
								tmpstr = "NOTE;CHARSET=" + charset + ":" + value;
								vcfstr += this.foldText(tmpstr) + this.CRLF;
							} else {
								// ...but don't fold the line
								vcfstr += "NOTE;CHARSET=" + charset + ":" + value + this.CRLF;
							}
						}
					}
					break;
				//
				// Messenger Information: AIM, GoogleTalk, Yahoo, Skype, MSN, ICQ, Jabber...
				//
				case "_AimScreenName":
					value = String(property.value);
					if (value != "") { vcfstr += "X-AIM:" + value + this.CRLF; }
					break;
				case "_GoogleTalk":
					value = String(property.value);
					if (value != "") { vcfstr += "X-GOOGLE-TALK:" + value + this.CRLF; }
					break;
				case "_Yahoo":
					value = String(property.value);
					if (value != "") { vcfstr += "X-YAHOO:" + value + this.CRLF; }
					break;
				case "_Skype":
					value = String(property.value);
					if (value != "") { vcfstr += "X-SKYPE:" + value + this.CRLF; }
					break;
				case "_MSN":
					value = String(property.value);
					if (value != "") { vcfstr += "X-MSN:" + value + this.CRLF; }
					break;
				case "_ICQ":
					value = String(property.value);
					if (value != "") { vcfstr += "X-ICQ:" + value + this.CRLF; }
					break;
				case "_JabberId":
					value = String(property.value);
					if (value != "") { vcfstr += "X-JABBER:" + value + this.CRLF; }
					break;
				//
				// handle non-string properties
				//
				case "PopularityIndex":
					vcfstr += "X-MOZILLA-PROPERTY;CHARSET=" + charset + ":PopularityIndex;" + String(property.value) + this.CRLF;
					break;
				case "PreferMailFormat":
					vcfstr += "X-MOZILLA-PROPERTY;CHARSET=" + charset + ":PreferMailFormat;" + String(property.value) + this.CRLF;
					break;
				case "AllowRemoteContent":
					vcfstr += "X-MOZILLA-PROPERTY;CHARSET=" + charset + ":AllowRemoteContent;" + String(property.value) + this.CRLF;
					break;
				//
				// intercept photo properties
				//
				case "PhotoURI":
					photoURI = String(property.value);
					break;
				case "PhotoType":
					photoType = String(property.value);
					break;
				case "PhotoName":
					photoName = String(property.value);
					break;
				//
				// finally, store other information as X-MOZILLA-PROPERTY
				//
				default:
					if (this.otherProperties.indexOf(property.name) > -1) {
						// yes, property is known (in this.otherProperties)
						var value = String(property.value).replace(/;/g,"\\;");
						if (value != "") {
							if (value.indexOf("\n") != -1) {
								// at least one line break is present: encoding needed
								if (useQPE) {
									// the user allows quoted printable: use it
									tmpstr = "X-MOZILLA-PROPERTY;CHARSET=" + charset + ";ENCODING=QUOTED-PRINTABLE:" + property.name + ";";
									if (doFolding) {
										// ...and folding is allowed, too!
										vcfstr += tmpstr + this.foldQuotedPrintable(this.toQuotedPrintable(value),tmpstr.length) + this.CRLF;
									} else {
										// ...but don't fold the line
										vcfstr += tmpstr + this.toQuotedPrintable(value) + this.CRLF;
									}
								} else {
									// fall back to base64 encoding
									tmpstr = "X-MOZILLA-PROPERTY;CHARSET=" + charset + ";ENCODING=BASE64:" + property.name + ";";
									if (doFolding) {
										// ...and folding is allowed, too!
										vcfstr += tmpstr + this.foldBase64(window.btoa(value),tmpstr.length) + this.CRLF + this.CRLF;
									} else {
										// ...but don't fold the line
										vcfstr += tmpstr + window.btoa(value) + this.CRLF;
									}
								}
							} else {
								// encoding not needed
								if (doFolding) {
									// ...but we are allowed to fold it!
									tmpstr = "X-MOZILLA-PROPERTY;CHARSET=" + charset + ":" + property.name + ";"+ value;
									vcfstr += this.foldText(tmpstr) + this.CRLF;
								} else {
									// ...but don't fold the line
									vcfstr += "X-MOZILLA-PROPERTY;CHARSET=" + charset + ":" + property.name + ";"+ value + this.CRLF;
								}
							}
						}
					}
			}
		}
		//
		// if lastname or firstname were defined, create name entry (N)
		//
		if (lastname.length > 0 || firstname.length > 0) {
			vcfstr += "N;CHARSET="+charset+":"+lastname+";"+firstname+";;;"+this.CRLF;
		}
		//
		// render non-empty address arrays into vCard ADR line
		//
		var strHomeAdr = homeAdr.join(";");
		if (strHomeAdr.length > 5) {
			vcfstr += "ADR;TYPE=HOME;CHARSET=" + charset + ":" + ";" + strHomeAdr + this.CRLF;
		}
		var strWorkAdr = workAdr.join(";");
		if (strWorkAdr.length > 5) {
			vcfstr += "ADR;TYPE=WORK;CHARSET=" + charset + ":" + ";" + strWorkAdr + this.CRLF;
		}
		//
		// combine department and company information
		//
		if (department != "" || company != "") {
			vcfstr += "ORG;CHARSET=" + charset + ":" + company + ";" + department + this.CRLF;
		}
		//
		// handle birthday date
		//
		if (year.length >= 4 && month.length >= 2 && day.length >= 2) {
			vcfstr += "BDAY:" + year.substr(0,4) + month.substr(0,2) + day.substr(0,2) + this.CRLF;
		} else {
			// incomplete date: store as X-MOZILLA properties
			if (year != "") { vcfstr += "X-MOZILLA-PROPERTY:BirthYear;" + year + this.CRLF; }
			if (month != "") { vcfstr += "X-MOZILLA-PROPERTY:BirthMonth;" + month + this.CRLF; }
			if (day != "") { vcfstr += "X-MOZILLA-PROPERTY:BirthDay;" + day + this.CRLF; }
		}
		//
		// construct photo data
		//
		switch (photoType) {
			case "web":
				if (photoURI != "") { vcfstr += "PHOTO;VALUE=URL:" + photoURI + this.CRLF; }
				break;
			case "binary":
				if (photoURI != "") {
					suffix = this.PhotoSuffixToType[this.determinePhotoSuffix(photoURI.substr(0,8)).toUpperCase()];
					if (suffix != undefined) {
						photoStr = "PHOTO;ENCODING=BASE64;TYPE=" + suffix + ":";
						if (doFolding) {
							vcfstr += photoStr + this.foldBase64(window.btoa(photoURI),photoStr.length) + this.CRLF + this.CRLF;
						} else {
							vcfstr += photoStr + window.btoa(photoData) + this.CRLF;
						}
					}
				}
				break;
			case "file":
				if (photoName != "") {
					photoData = this.readPhotoFromProfile(photoName);
					suffix = this.PhotoSuffixToType[this.determinePhotoSuffix(photoData.substr(0,8)).toUpperCase()];
					if (suffix != undefined) {
						photoStr = "PHOTO;ENCODING=BASE64;TYPE=" + suffix + ":";
						if (doFolding) {
							vcfstr += photoStr + this.foldBase64(window.btoa(photoData),photoStr.length) + this.CRLF + this.CRLF;
						} else {
							vcfstr += photoStr + window.btoa(photoData) + this.CRLF;
						}
					}
				}
		}
		vcfstr += "END:VCARD" + this.CRLF;
		return vcfstr;
	},
	
	/**
	 * Extract the UIDs from a vCard data string. If this fails, an empty
	 * array is returned.
	 *
	 * @param datastr data string
	 * @return UID Array, might be empty or might contain empty strings
	 */
	readUID: function(datastr) {
		try {
			var uid = /BEGIN:VCARD[\S\s]*UID:(.*)\r\n[\S\s]*END:VCARD/.exec(cardstr)[1];
		} catch (exception) {
			var uid = "";
		}
		return uid;
	},
	
	/**
	 * Helper function
	 */
	interpretVCardString: function (datastr,encoding) {
		// split data string into separate vCards
		// this takes care of vCards carrying vCards
		var retval = new Array();
		var cardstr = datastr.split("END:VCARD");
		for (i = 0; i < cardstr.length-1; i++) {
			// interpret individual strings (stripped of leading or
			// trailing line breaks; reconstructed END tag)
			var vCardStr = cardstr[i].replace(/^[\r\n]*/,"").replace(/[\r\n]*$/,"\r\n").concat("END:VCARD");
			// interpret single vCard string
			var card = this.interpretSingleVCardString(vCardStr,encoding);
			// if interpretation leads indeed to a nsIAbCard, add to array
			if (card instanceof Components.interfaces.nsIAbCard) {
				retval.push(card);
			}
		}
		return retval;
	},
	
	/**
	 * Converts a vCard content string to an addressbook card;
	 * a photo is stored in vCardPhotoData/vCardPhotoType for post-processing
	 * Quoted-printable as well as Base64 encoding are decoded.
	 *
	 * if the datastring is not recognized as vCard content, null is returned.
	 *
	 * @param datastr vCard content string
	 * @param encoding user-defined encoding of this string
	 * @return nsIAbCard or null if conversion failed
	 */
	interpretSingleVCardString: function (datastr,encoding) {

		// do some regular expression magic
		
		try {
			// make sure file begins with BEGIN:VCARD and ends with END:VCARD
			var tmp = /BEGIN:VCARD\r\n([\s\S]*)END:VCARD/.exec(datastr)[1];
			
			// replace lines ending with a "=" and followed by a
			// line break with just a line break;
			// remove line break masking characters of QPE encoding
			tmp = tmp.replace(/=\r\n([^\r\n])/g,"$1");
			
			// replace all linebreaks followed by a tab or space (=LWSP)
			// by a single LWSP; this implements the "folding"
			// technique specified in the vCard standard
			tmp = tmp.replace(/\r\n([\s])/g,"$1");
			
			// unmaks all masked (escaped) characters, i.e. \; \, \\
			tmp = tmp.replace(/\\(;|,|\\)/g,"$1");
			
			// finally, split the datastring at \r\n line breaks
			var lines = tmp.split(this.CRLF);
		} catch (exception) {
			// regular expression failed: no vCard? return null
			return null;
		}
		
		var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]  
			.createInstance(Components.interfaces.nsIAbCard);
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		var i = 0;
		
		while (i < lines.length) {
			// process each vCard property line
			// expected: name;name;...:value;value;...
			// results are stored in an object as a dictionary mapping name to value
			var properties = Object();
			try {
				var posColon = lines[i].indexOf(":");
				if (posColon == -1 ) { throw "undefined"; }
				
				property = lines[i].substr(0,posColon).toUpperCase().split(";"); // case insensitive properties! -> toUpperCase
				switch (property[0]) {
					case "FN":
					case "PHOTO":
					case "BDAY":
					case "TEL":
					case "EMAIL":
					case "TITLE":
					case "NOTE":
					case "URL":
					case "REV":
					case "UID":
					case "VERSION":
						// these properties only feature one value
						// thus the value doesn't need to be split up
						// (just in case the optional semi-colon masking is
						// really interpreted as optional; otherwise we would
						// miss the remainder of the field after the first ";")
						value = [lines[i].substr(posColon+1)];
						break;
					default:
						// property features multiple values (compound property)
						// therefore, it is split up along semi-colons...
						value = lines[i].substr(posColon+1).split(";");
				}
				for (var k = 1; k < property.length; k++) {
					var prop = property[k].split("=");
					switch (prop.length) {
						case 1:
							properties[prop[0]] = true;
							break;
						case 2:
							properties[prop[0]] = prop[1];
							properties[prop[1]] = true;
					}
				}
  			} catch (exception) {
  				i++;
  				continue;
  			}
			
			try {
				var charset = properties["CHARSET"].toUpperCase();
			}
			catch (exception) {
				// fall back to default encoding
				var charset = encoding;
			}
			
			// values seem to be encoded as quoted printable: decode
			if (properties["ENCODING"] == "QUOTED-PRINTABLE" || properties["QUOTED-PRINTABLE"]) {
				for (var k = 0; k < value.length; k++) {
					value[k] = this.fromQuotedPrintable(value[k]);
				}
			}
			// values seem to be encoded as Base64: decode
			if (properties["ENCODING"] == "BASE64" || properties["BASE64"]) {
				for (var k = 0; k < value.length; k++) {
					try {
						// eliminate spaces that might be remainders of line breaks
						value[k] = window.atob(value[k].replace(/ /g,""));
					} catch (exception) {
						value[k] = "";
					}
				}
			}
			
			if (property[0] != "PHOTO") {
				converter.charset = charset;
				for (var k = 0; k < value.length; k++) {
					try { value[k] = converter.ConvertToUnicode(value[k]); }
					catch (exception) {}
				}
			}
			
			// process vCard properties and set corresponding nsIAbCard properties
			switch (property[0]) {
				case "FN":
					if (value[0] != "") { card.setProperty("DisplayName",value[0]); }
					break;
				case "N":
					if (value[0] != "") { card.setProperty("LastName",value[0]); }
					if (value[1] != "") { card.setProperty("FirstName",value[1]); }
					break;
				case "PHOTO":
					if (value[0] != "") {
						card.setProperty("PhotoName","");
						if (properties["VALUE"] == "URL") {
							card.setProperty("PhotoType","web");
							card.setProperty("PhotoURI",value[0]);
						}
						else {
							card.setProperty("PhotoType","binary");
							card.setProperty("PhotoURI",value[0]);
						}
					}
					break;
				case "BDAY":
					value[0]  = value[0].replace(/-/g,"");
					var year  = value[0].substr(0,4);
					var month = value[0].substr(4,2);
					var day   = value[0].substr(6,2);
					if (year != "" && month != "" && day != "") {
						card.setProperty("BirthYear",year);
						card.setProperty("BirthMonth",month);
						card.setProperty("BirthDay",day);
					}
					break;
				case "ADR":
// 					if (properties["WORK"]) { properties["TYPE"] = "WORK"; }
// 					if (properties["HOME"]) { properties["TYPE"] = "HOME"; }
					switch (properties["TYPE"]) {
						case "HOME":
							properties["TYPE"] = "Home";
							break;
						case "WORK":
							properties["TYPE"] = "Work";
							break;
						default:
							properties["TYPE"] = "Home";
					}
					if (value[1] != "") {
						card.setProperty(properties["TYPE"]+"Address2",value[1]);
					}
					if (value[2] != "") {
						card.setProperty(properties["TYPE"]+"Address",value[2]);
					}
					if (value[3] != "") {
						card.setProperty(properties["TYPE"]+"City",value[3]);
					}
					if (value[4] != "") {
						card.setProperty(properties["TYPE"]+"State",value[4]);
					}
					if (value[5] != "") {
						card.setProperty(properties["TYPE"]+"ZipCode",value[5]);
					}
					if (value[6] != "") {
						card.setProperty(properties["TYPE"]+"Country",value[6]);
					}
					break;
				case "TEL":
					var teltype = "HomePhone";
					if (properties["CELL"]) {
						teltype = "CellularNumber";
					} else {
						if (properties["FAX"]) {
							teltype = "FaxNumber";
						} else {
							if (properties["PAGER"]) {
								teltype = "PagerNumber";
							} else {
								if (properties["WORK"]) {
									teltype = "WorkPhone";
								}
							}
						}
					}
					card.setProperty(teltype,value[0]);
					break;
				case "EMAIL":
					if (properties["SECONDARY"]) {
						card.setProperty("SecondEmail",value[0]);
					} else {
						card.setProperty("PrimaryEmail",value[0]);
					}
					break;
				case "TITLE":
					if (value[0] != "") { card.setProperty("JobTitle",value[0]); }
					break;
				case "ORG":
					if (value[0] != "") { card.setProperty("Company",value[0]); }
					if (value[1] != "") { card.setProperty("Department",value[1]); }
					break;
				case "NOTE":
					if (value[0] != "") { card.setProperty("Notes",value[0]); }
					break;
				case "URL":
					if (value[0] != "") {
						if ((properties["TYPE"] == "WORK") || (properties["WORK"] == true)) {
							card.setProperty("WebPage1",value[0]);
						} else {
							card.setProperty("WebPage2",value[0]);
						}
					}
					break;
				case "REV":
					var revdate = Date.parse(value[0])/1000.0;
					if (revdate > 0) {
						card.setProperty("LastModifiedDate",revdate);
					}
					break;
				case "X-MOZILLA-PROPERTY":
					if ((value[0] != "") && (value[1] != "")) {
						switch (value[0]) {
							case "AllowRemoteContent":
							case "PopularityIndex":
							case "PreferMailFormat":
								value[1] = Number(value[1]);
								if (isNaN(value[1])) { value[1] = 0; }
								break;
						}
						card.setProperty(value[0],value[1]);
					}
					break;
				case "UID":
					card.setProperty("UID",value[0]);
					break;
				case "X-AIM":
					card.setProperty("_AimScreenName",value[0]);
					break;
				case "X-ICQ":
					card.setProperty("_ICQ",value[0]);
					break;
				case "X-GOOGLE-TALK":
					card.setProperty("_GoogleTalk",value[0]);
					break;
				case "X-JABBER":
					card.setProperty("_JabberId",value[0]);
					break;
				case "X-MSN":
					card.setProperty("_MSN",value[0]);
					break;
				case "X-YAHOO":
					card.setProperty("_Yahoo",value[0]);
					break;
				case "X-SKYPE":
					card.setProperty("_Skype",value[0]);
					break;
			}
			i++;
		}
		return card;
	},
	
	/**
	 * Write a message to Thunderbird's error console
	 * 
	 * @param msg message string
	 */
	logMsg: function (msg) {
		Components.classes["@mozilla.org/consoleservice;1"]
			.getService(Components.interfaces.nsIConsoleService)
			.logStringMessage("[ThunderSync/vCardLib] "+msg);
	},
	
}
