/**
 * @filesource   extra-layers.js
 * @created      12.08.2020
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2020 smiley
 * @license      MIT
 */

import {layer_wvw_boss_icon} from './boss-icon.json';
import {layer_jumpingpuzzle_icon} from './jumpingpuzzle-icon.json';
import {layer_sentry_icon} from './sentry-icon.json';
import {objectives} from './objectives.json';

const GW2MAP_EXTRA_LAYERS = {
	wvw_boss_icon: layer_wvw_boss_icon,
	jumpingpuzzle_icon: layer_jumpingpuzzle_icon,
	sentry_icon: layer_sentry_icon,
};

const GW2_WVW_OBJECTIVES = objectives;

export {GW2MAP_EXTRA_LAYERS, GW2_WVW_OBJECTIVES};
