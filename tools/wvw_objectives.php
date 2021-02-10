<?php
/**
 * @created      01.02.2021
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2021 smiley
 * @license      MIT
 */


// fetch languages
$apiLang = [];

foreach(['de', 'es', 'fr', 'zh'] as $lang){
	$apiLangObjectives = json_decode(file_get_contents('https://api.guildwars2.com/v2/wvw/objectives?ids=all&lang='.$lang));

	foreach($apiLangObjectives as $o){
		$apiLang[$o->id][$lang] = $o->name;
	}

}

$apiObjectives = json_decode(file_get_contents('https://api.guildwars2.com/v2/wvw/objectives?ids=all&lang=en'), true);

$objectives = [
	'objectives' => []
];

$dir = realpath(__DIR__.'/wvw').'/';

$fixtures = [
	// mercenary camps
	'38-123' => [9975, 14201],
	'38-125' => [11274, 14097],
	'38-126' => [10685, 15300],
];

foreach($apiObjectives as $o){

	// red alpine and green/blue desert borderlands are not implemented
	if(in_array($o['map_id'], [94, 1102, 1143], true)){
		continue;
	}

	// fix coords
	if(isset($o['coord'])){
		[$x, $y, ] = $o['coord'];
		$o['coord'] = [(int)round($x), (int)round($y)];
	}
	else if($o['type'] !== 'Spawn'){
		$o['coord'] = $fixtures[$o['id']];
	}

	if(isset($o['label_coord'])){
		[$x, $y, ] = $o['label_coord'];
		$o['label_coord'] = [(int)round($x), (int)round($y)];
	}

	// assign localized names
	$names = ['en' => $o['name']];

	foreach(['de', 'es', 'fr', 'zh'] as $lang){
		$names[$lang] = $apiLang[$o['id']][$lang];
	}

	ksort($names);

	$o['name'] = $names;
	$o['type'] = strtolower($o['type']);

	// unset stuff
	$mapID = $o['map_id'];

	unset($o['map_id'], $o['map_type'], $o['upgrade_id'], $o['marker']);

	ksort($o);

	if($o['type'] === 'spawn'){

		if(in_array($o['sector_id'], [850, 993, 974, 1350, 1494])){
			$o['color'] = 'green';
		}
		elseif(in_array($o['sector_id'], [836, 980, 1000, 1311, 1507])){
			$o['color'] = 'blue';
		}
		elseif(in_array($o['sector_id'], [845, 977, 997, 1343, 1492])){
			$o['color'] = 'red';
		}

		unset($o['chat_link']);
	}
	else{
		unset($o['label_coord']);
	}

	$objectives['objectives'][$mapID][] = $o;
}

$json = json_encode($objectives, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
$json = preg_replace('/\[\s*(\d+)\s*,\s*(\d+)\s*\]/', '[$1, $2]', $json);
$json = str_replace('    ', "\t", $json);

file_put_contents(__DIR__.'/../src/data/objectives.json', $json);
