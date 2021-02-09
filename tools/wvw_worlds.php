<?php
/**
 * @created      03.02.2021
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2021 smiley
 * @license      MIT
 */

// fetch languages
$apiWorlds = [];

foreach(['de', 'en', 'es', 'fr', 'zh'] as $lang){
	$apiLangWorlds = json_decode(file_get_contents('https://api.guildwars2.com/v2/worlds?ids=all&lang='.$lang));

	foreach($apiLangWorlds as $w){

		$id = (string)$w->id;

		if($id[1] === '1'){
			$lng = 'fr';
		}
		elseif($id[1] === '2'){
			$lng = 'de';
		}
		elseif($id[1] === '3'){
			$lng = 'es';
		}
		else{
			$lng = 'en';
		}

		$apiWorlds['i18n_worlds'][$w->id]['region']      = $id[0] === '1' ? 'NA' : 'EU';
		$apiWorlds['i18n_worlds'][$w->id]['lang']        = $lng;
		$apiWorlds['i18n_worlds'][$w->id]['name'][$lang] = $w->name;
	}

}

$json = json_encode($apiWorlds, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
$json = str_replace('    ', "\t", $json);

file_put_contents(__DIR__.'/../src/i18n/i18n-worlds.json', $json);
