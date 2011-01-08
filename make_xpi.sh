#!/bin/bash

zip -r thundersync-1.1.xpi \
	chrome.manifest \
	README \
	COPYING \
	install.rdf \
	content/ThunderSyncDialog.css \
	content/ThunderSyncVCardLib.js \
	content/ThunderSyncPreferences.xul \
	content/ThunderSyncDialog.js \
	content/ThunderSyncDialog.xul \
	content/ThunderSyncMenuItem.xul \
	content/ThunderSyncPreferences.js \
	locale/en/ThunderSyncMenuItem.dtd \
	locale/en/ThunderSyncDialog.dtd \
	locale/en/ThunderSyncPreferences.properties \
	locale/en/ThunderSyncDialog.properties \
	locale/en/ThunderSyncPreferences.dtd \
	locale/de/ThunderSyncMenuItem.dtd \
	locale/de/ThunderSyncDialog.dtd \
	locale/de/ThunderSyncPreferences.properties \
	locale/de/ThunderSyncDialog.properties \
	locale/de/ThunderSyncPreferences.dtd

