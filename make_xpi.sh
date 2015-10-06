#!/bin/bash

zip -r thundersync-2.4.xpi \
	chrome.manifest \
	README \
	COPYING \
	install.rdf \
	components/ThunderSyncAutoSync.js \
	content/ThunderSyncDialog.css \
	content/ThunderSyncDialog.js \
	content/ThunderSyncDialog.xul \
	content/ThunderSyncMenuItem.js \
	content/ThunderSyncMenuItem.xul \
	content/ThunderSyncPreferences.css \
	content/ThunderSyncPreferences.js \
	content/ThunderSyncPreferences.xul \
	content/ThunderSyncToolbar.xul \
	content/ThunderSyncVCardLib.js \
	locale/de/ThunderSyncDialog.dtd \
	locale/de/ThunderSyncDialog.properties \
	locale/de/ThunderSyncMenuItem.dtd \
	locale/de/ThunderSyncMenuItem.properties \
	locale/de/ThunderSyncPreferences.dtd \
	locale/de/ThunderSyncPreferences.properties \
	locale/en/ThunderSyncDialog.dtd \
	locale/en/ThunderSyncDialog.properties \
	locale/en/ThunderSyncMenuItem.dtd \
	locale/en/ThunderSyncMenuItem.properties \
	locale/en/ThunderSyncPreferences.dtd \
	locale/en/ThunderSyncPreferences.properties \
	locale/es/ThunderSyncDialog.dtd \
	locale/es/ThunderSyncDialog.properties \
	locale/es/ThunderSyncMenuItem.dtd \
	locale/es/ThunderSyncMenuItem.properties \
	locale/es/ThunderSyncPreferences.dtd \
	locale/es/ThunderSyncPreferences.properties \
	skin/icon.png \
	skin/icon24.png \
	skin/icon64.png
