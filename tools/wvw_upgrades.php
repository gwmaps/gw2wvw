<?php
/**
 * @created      05.02.2021
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2021 smiley
 * @license      MIT
 */

$wvw_tactics = [
	// improvements
	183, // Auto Turrets
	365, // Packed Dolyaks
	147, // Iron Guards
	307, // Armored Dolyaks
	306, // Sabotage Depot
	418, // Presence of the Keep
	562, // Speedy Dolyaks
	329, // Hardened Siege
	389, // Hardened Gates
	168, // Cloaking Waters
	583, // Watchtower
	// tactics
	590, // Dragon Banner
	222, // Dune Roller
	483, // Minor Supply Drop
	559, // Chilling Fog
	298, // Airship Defense
	178, // Emergency Waypoint
	399, // Turtle Banner
	513, // Invulnerable Fortifications
	383, // Invulnerable Dolyaks
	345, // Centaur Banner
];

// fetch languages
$apiUpgradeLang = [];

foreach(['de', 'es', 'fr', 'zh'] as $lang){//
	$apiLangUpgrades = json_decode(file_get_contents('https://api.guildwars2.com/v2/guild/upgrades?ids=all&lang='.$lang));

	foreach($apiLangUpgrades as $u){

		if(!in_array($u->id, $wvw_tactics, true)){
			continue;
		}


		$apiUpgradeLang[$u->id]['name'][$lang]        = str_replace(' ', ' ', $u->name);
		$apiUpgradeLang[$u->id]['description'][$lang] = str_replace(' ', ' ', $u->description);
	}

}

$upgrades = [];

$apiUpgrades = json_decode(file_get_contents('https://api.guildwars2.com/v2/guild/upgrades?ids=all&lang=en'), true);
foreach($apiUpgrades as $u){

	if(!in_array($u['id'], $wvw_tactics, true)){
		continue;
	}

	// assign localized names
	$names        = ['en' => $u['name']];
	$descriptions = ['en' => $u['description']];

	foreach(['de', 'es', 'fr', 'zh'] as $lang){
		$names[$lang]        = $apiUpgradeLang[$u['id']]['name'][$lang];
		$descriptions[$lang] = $apiUpgradeLang[$u['id']]['description'][$lang];
	}

	ksort($names);
	ksort($descriptions);

	$u['name']        = $names;
	$u['description'] = $descriptions;

	file_put_contents(__DIR__.'/../src/style/img/guild_upgrade_'.$u['id'].'.png', file_get_contents($u['icon']));

	// unset stuff
	$upgradeID = $u['id'];

	unset($u['id'], $u['build_time'], $u['type'], $u['required_level'], $u['experience'], $u['prerequisites'], $u['costs']);

	ksort($u);

	$upgrades['i18n_guild_upgrades'][$upgradeID] = $u;
}

$json = json_encode($upgrades, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
$json = str_replace('    ', "\t", $json);

file_put_contents(__DIR__.'/../src/i18n/i18n-upgrades.json', $json);
