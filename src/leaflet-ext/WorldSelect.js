/**
 * @created      09.02.2021
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2021 smiley
 * @license      MIT
 */

// noinspection ES6PreferShortImport
import {Control, DomEvent, DomUtil} from '../../node_modules/leaflet/dist/leaflet-src.esm';

export default class WorldSelect extends Control{

	options = {
		position: 'bottomleft',
	};

	_matchups;
	_matchWorlds;
	_mapOptions;
	_worldSelectCallback;

	constructor(matches, matchWorlds, mapOptions, callback, options){
		super(options);

		this._matchups            = matches;
		this._matchWorlds         = matchWorlds;
		this._mapOptions          = mapOptions;
		this._worldSelectCallback = callback;
	}

	onAdd(map){
		let container = DomUtil.create('div', 'leaflet-control-worldselect');
		let select    = DomUtil.create('select', '', container);

		// add one empty option element to the world selector
		let firstOption = DomUtil.create('option', '', select);
		firstOption.innerText = '[select world]'; // @todo: translate

		Object.keys(this._matchWorlds).forEach(worldID => {
			let world = this._matchWorlds[worldID];
			let option = DomUtil.create('option', world.color, select);
			option.innerText = world.name[this._mapOptions.lang];
			option.value     = world.match;
		})

		DomEvent.on(select, 'change', this._worldSelectCallback);

		return container;
	}

}
