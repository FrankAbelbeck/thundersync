#!/bin/bash

zip -r thundersync-2.1.xpi \
	chrome.manifest \
	README \
	COPYING \
	install.rdf \
	components/ThunderSyncAutoSync.js \
	content/ThunderSyncDialog.css \
	content/ThunderSyncDialog.js \
	content/ThunderSyncDialog.xul \
	content/ThunderSyncMenuItem.xul \
	content/ThunderSyncPreferences.js \
	content/ThunderSyncPreferences.xul \
	content/ThunderSyncToolbar.xul \
	content/ThunderSyncVCardLib.js \
	locale/de/ThunderSyncDialog.dtd \
	locale/de/ThunderSyncDialog.properties \
	locale/de/ThunderSyncMenuItem.dtd \
	locale/de/ThunderSyncPreferences.dtd \
	locale/de/ThunderSyncPreferences.properties \
	locale/en/ThunderSyncDialog.dtd \
	locale/en/ThunderSyncDialog.properties \
	locale/en/ThunderSyncMenuItem.dtd \
	locale/en/ThunderSyncPreferences.dtd \
	locale/en/ThunderSyncPreferences.properties \
	skin/icon.png \
	skin/icon24.png \
	skin/icon64.png
