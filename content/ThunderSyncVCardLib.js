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
	baseProperties: new Array(
// 		"LastModifiedDate",
		"LastName", "FirstName",
 		"DisplayName",
		"PrimaryEmail", "SecondEmail",
		"HomeAddress", "HomeAddress2", "HomeCity", "HomeState",
		"HomeZipCode", "HomeCountry",
		"WorkAddress", "WorkAddress2", "WorkCity", "WorkState",
		"WorkZipCode", "WorkCountry",
		"HomePhone", "WorkPhone", "FaxNumber", "CellularNumber",
		"JobTitle", "Department", "Company", "WebPage1", "WebPage2",
		"BirthYear", "BirthMonth", "BirthDay", "Notes"
	),
	
	// list of photo properties
	photoProperties: new Array(
		"PhotoName", "PhotoType", "PhotoURI"
	),
	
	// list of string properties stored as X-MOZILLA-PROPERTY-STR
	otherProperties: new Array(
		"NickName", "PhoneticFirstName", "PhoneticLastName",
		"SpouseName", "FamilyName",
		"AnniversaryDay", "AnniversaryMonth", "AnniversaryYear",
		"HomePhoneType", "WorkPhoneType", "FaxNumberType",
		"PagerNumberType", "CellularNumberType",
		"_AimScreenName",
		"PopularityIndex", "PreferMailFormat",		// int
		"AllowRemoteContent",				// bool
		"Custom1", "Custom2", "Custom3", "Custom4"	// base64?
	),
	
	// list of all properties, union of aforementioned lists
	allProperties: Array.concat(
		this.baseProperties,
		this.photoProperties,
		this.otherProperties
	),
	
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
	 * Converts an addressbook contact ("card") to a vCard string.
	 * Properties which cannot be mapped to vCard properties are
	 * encoded as X-MOZILLA-PROPERTY:PropertyName;PropertyValue.
	 *
	 * Standard charset of vCards is ASCII. If non-ASCII characters are
	 * encountered, charset UTF-8 is set.
	 *
	 * @param card nsIAbCard
	 * @param encoding
	 * @return ASCII string with vCard content
	 */
	fromCard: function (card,encoding) {
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = encoding;
		
		var value = "";
		var tmpstr = "";
		var vcfstr = "BEGIN:VCARD" + this.CRLF + "VERSION:2.1" + this.CRLF;
		
 		try {
			var rev = card.getProperty("LastModifiedDate",0);
			if (rev > 0) {
				function zeropad(n){return n<10 ? '0'+n : n}
				
				var revdate = new Date(rev*1000);
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
		
		var lastname = card.getProperty("LastName","");
		var firstname = card.getProperty("FirstName","");
		vcfstr += "N;CHARSET="+encoding+":"
			+ lastname + ";"
			+ firstname + ";;;"
			+ this.CRLF;
		
		value = card.getProperty("DisplayName","");
		if (value != "") {
			vcfstr += "FN;CHARSET="+encoding+":" + value + this.CRLF;
		}
		
		try {
			value = card.getProperty("UID","");
			if (value != "") {
				vcfstr += "UID:" + value + this.CRLF;
			}
		} catch (exception) {}
		
		value = card.getProperty("PrimaryEmail","");
		if (value != "") {
			vcfstr += "EMAIL;TYPE=INTERNET:" + value + this.CRLF;
		}
		
		value = card.getProperty("SecondEmail","");
		if (value != "") {
			vcfstr += "EMAIL;TYPE=INTERNET:" + value + this.CRLF;
		}
		
		value = card.getProperty("HomeAddress2","");
		value += ";" + card.getProperty("HomeAddress","");
		value += ";" + card.getProperty("HomeCity","");
		value += ";" + card.getProperty("HomeState","");
		value += ";" + card.getProperty("HomeZipCode","");
		value += ";" + card.getProperty("HomeCountry","");
		if (value.length > 5) {
			vcfstr += "ADR;TYPE=HOME;CHARSET="+ encoding +":" + ";" + value + this.CRLF;
		}
		
		value = card.getProperty("WorkAddress2","");
		value += ";" + card.getProperty("WorkAddress","");
		value += ";" + card.getProperty("WorkCity","");
		value += ";" + card.getProperty("WorkState","");
		value += ";" + card.getProperty("WorkZipCode","");
		value += ";" + card.getProperty("WorkCountry","");
		if (value.length > 5) {
			vcfstr += "ADR;TYPE=WORK;CHARSET="+ encoding +":" + ";" + value + this.CRLF;
		}
		
		value = card.getProperty("HomePhone","");
		if (value != "") {
			vcfstr += "TEL;HOME;VOICE:" + value + this.CRLF;
		}
		
		value = card.getProperty("WorkPhone","");
		if (value != "") {
			vcfstr += "TEL;WORK;VOICE:" + value + this.CRLF;
		}
		
		value = card.getProperty("FaxNumber","");
		if (value != "") { vcfstr += "TEL;FAX:" + value + this.CRLF; }
		
		value = card.getProperty("CellularNumber","");
		if (value != "") { vcfstr += "TEL;CELL:" + value + this.CRLF; }
		
		value = card.getProperty("JobTitle","");
		if (value != "") {
			vcfstr += "TITLE;CHARSET="+encoding+":" + value + this.CRLF;
		}
		
		var department = card.getProperty("Department","");
		var company = card.getProperty("Company","");
		if (department != "" || company != "") {
			vcfstr += "ORG;CHARSET="+encoding+":"
				+ company + ";"
				+ department
				+ this.CRLF;
		}

		value = card.getProperty("WebPage1","");
		if (value != "") { vcfstr += "URL;TYPE=WORK:" + value + this.CRLF; }
		
		value = card.getProperty("WebPage2","");
		if (value != "") { vcfstr += "URL;TYPE=HOME:" + value + this.CRLF; }
		
		var year = card.getProperty("BirthYear","");
		var month = card.getProperty("BirthMonth","");
		var day = card.getProperty("BirthDay","");
		if (year.length >= 4 && month.length >= 2 && day.length >= 2) {
			vcfstr += "BDAY:"
				+ year.substr(0,4)
				+ month.substr(0,2)
				+ day.substr(0,2)
				+ this.CRLF;
		}
		else {
			// incomplete date: store as X-MOZILLA properties
			if (year != "") {
				vcfstr += "X-MOZILLA-PROPERTY:BirthYear;"
					+ year + this.CRLF;
			}
			if (month != "") {
				vcfstr += "X-MOZILLA-PROPERTY:BirthMonth;"
					+ month + this.CRLF;
			}
			if (month != "") {
				vcfstr += "X-MOZILLA-PROPERTY:BirthDay;"
					+ day + this.CRLF;
			}
		}
		
		value = converter.ConvertFromUnicode(card.getProperty("Notes",""));
		if (value != "") {
			tmpstr = "NOTE;CHARSET="+encoding+";QUOTED-PRINTABLE:"
			vcfstr += tmpstr + this.foldQuotedPrintable(
					this.toQuotedPrintable(value),
					tmpstr.length
				) + this.CRLF;
		}
		
		for (var i = 0; i < this.otherProperties.length; i++) {
			value = converter.ConvertFromUnicode(card.getProperty(this.otherProperties[i],""));
			if (value != "") {
				tmpstr = "X-MOZILLA-PROPERTY;CHARSET="+encoding+";QUOTED-PRINTABLE:"
				vcfstr += tmpstr + this.foldQuotedPrintable(
					this.toQuotedPrintable(
						this.otherProperties[i] + ";" + value
					),
					tmpstr.length
				) + this.CRLF;
			}
		}
		
		switch (card.getProperty("PhotoType","")) {
			case "web":
				var photoURI  = card.getProperty("PhotoFile","");
				vcfstr += "PHOTO;VALUE=URL:"
					+ photoURI
					+ this.CRLF;
				break;
			case "binary":
				var photoData = card.getProperty("PhotoURI","");
				var suffix = this.PhotoSuffixToType[
					this.determinePhotoSuffix(
						photoData.substr(0,8)
					).toUpperCase()];
				if (suffix != undefined) {
					var photostr = "PHOTO;BASE64;TYPE="
						+ suffix + ":";
					vcfstr += photostr
						+ this.foldBase64(
							window.btoa(photoData),
							photostr.length
						) + this.CRLF + this.CRLF;
				}
				break;
			case "file":
				var photoName = card.getProperty("PhotoName","");
				var photoData = this.readPhotoFromProfile(photoName);
				var suffix = this.PhotoSuffixToType[
					this.determinePhotoSuffix(
						photoData.substr(0,8)
					).toUpperCase()];
				if (suffix != undefined) {
					var photostr = "PHOTO;BASE64;TYPE="
						+ suffix + ":";
					vcfstr += photostr
						+ this.foldBase64(
							window.btoa(photoData),
							photostr.length
						) + this.CRLF + this.CRLF;
				}
				break;
		}
		
		vcfstr += "END:VCARD" + this.CRLF;
		return vcfstr;
	},
	
	/**
	 *
	 */
	readUID: function(datastr) {
		try {
			var uid = /BEGIN:VCARD[\S\s]*UID:(.*)\r\n[\S\s]*END:VCARD/.exec(datastr)[1];
		} catch (exception) {
			var uid = "";
		}
		return uid;
	},
	
	
	/**
	 * Converts a vCard content string to an addressbook card;
	 * a photo is stored in vCardPhotoData/vCardPhotoType for post-processing
	 * Quoted-printable as well as Base64 encoding are decoded.
	 *
	 * @param datastr
	 * @param encoding
	 * @return nsIAbCard
	 */
	toCard: function (datastr,encoding) {
		var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]  
			.createInstance(Components.interfaces.nsIAbCard);
		try {
// 			var lines = /BEGIN:VCARD\r\n([\s\S]*)END:VCARD/
// 				.exec(datastr)[1]
// 				.replace(/=\r\n([^\r\n])/g,"$1")
// 				.replace(/\r\n[\t| ]/g," ")
// 				.split(this.CRLF);
			var tmp = /BEGIN:VCARD\r\n([\s\S]*)END:VCARD/.exec(datastr)[1];
			tmp=tmp.replace(/=\r\n([^\r\n])/g,"$1");
			tmp=tmp.replace(/\r\n[\t| ]/g," ");
			var lines=tmp.split(this.CRLF);
		} catch (exception) {
			var lines = new Array();
		}
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		var i = 0;
		while (i < lines.length) {
			var properties = Object();
			try {
				var posColon = lines[i].indexOf(":");
				if (posColon == -1 ) { throw "undefined"; }
				var property = lines[i].substr(0,posColon).split(";");
				var value = lines[i].substr(posColon+1).split(";");
				for (var k = 1; k < property.length; k++) {
					var prop = property[k].split("=");
					switch (prop.length) {
						case 1:
							properties[prop[0]] = true;
							break;
						case 2: properties[prop[0]] = prop[1];
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
				var charset = encoding;
			}
			
			if (properties["ENCODING"] == "QUOTED-PRINTABLE" || properties["QUOTED-PRINTABLE"]) {
				for (var k = 0; k < value.length; k++) {
					value[k] = this.fromQuotedPrintable(value[k]);
				}
			}
			if (properties["ENCODING"] == "BASE64" || properties["BASE64"]) {
				for (var k = 0; k < value.length; k++) {
					try {
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
					if (properties["WORK"] == true) { properties["TYPE"] = "WORK"; }
					if (properties["HOME"] == true) { properties["TYPE"] = "HOME"; }
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
					if (properties["CELL"] == true) {
						teltype = "CellularNumber";
					}
					if (properties["FAX"] == true) {
						teltype = "FaxNumber";
					}
					if (properties["WORK"] == true && properties["VOICE"]) {
						teltype = "WorkPhone";
					}
					if (properties["HOME"] == true && properties["VOICE"]) {
						teltype = "HomePhone";
					}
					card.setProperty(teltype,value[0]);
					break;
				case "EMAIL":
					if (value[0] != "") {
						if (card.getProperty("PrimaryEmail","") == "") {
							card.setProperty("PrimaryEmail",value[0]);
						}
						else {
							card.setProperty("SecondEmail",value[0]);
						}
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
						if (properties["TYPE"] == "WORK" || properties["WORK"] == true) {
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
					if (value[0] != "" && value[1] != "") {
						card.setProperty(value[0],value[1]);
					}
					break;
				case "UID":
					card.setProperty("UID",value[0]);
					break;
			}
			i++;
		}
		return card;
	},
	
}
