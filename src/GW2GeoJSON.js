/**
 * @filesource   GW2GeoJSON.js
 * @created      09.08.2020
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2020 smiley
 * @license      MIT
 */

import GW2ContinentRect from './GW2ContinentRect';
import {GW2W_POI_NAMES, GW2W_HEROPOINT_NAMES, GW2W_SECTOR_NAMES} from './i18n/poi-names';
import {GW2MAP_EXTRA_LAYERS} from './data/extra-layers';
import Utils from './util/Utils';
import GeoJSONFeatureCollection from './util/GeoJSONFeatureCollection';

export default class GW2GeoJSON{

	// fixed sort order for the main overlays
	featureCollections = {
		landmark_icon: null,
		waypoint_icon: null,
		heropoint_icon: null,
		vista_icon: null,
		unlock_icon: null,
		jumpingpuzzle_icon: null,
		region_label: null,
		map_label: null,
		sector_label: null,
		sector_poly: null,
	};

	map_rects = {};
	floordata;
	language;

	// @todo: deletme
	worldmap = [38, 95, 96, 899, 968, 1099, 1315];

	/**
	 * GW2GeoJSON constructor
	 *
	 * @param {*} floordata
	 * @param {GW2MapDataset.dataset} dataset
	 */
	constructor(floordata, dataset){
		this.floordata     = floordata;
		this.dataset       = dataset;
		this.extraMarkers  = ['adventure_icon', 'jumpingpuzzle_icon', 'masterypoint_icon'].concat(this.dataset.extraLayers);
	}

	/**
	 * @param {string} layer
	 * @param {string|number} id
	 * @param {number} mapID
	 * @param {string} name
	 * @param {*} properties
	 * @param {*} geometry
	 * @param {string} [geometryType]
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_addFeature(layer, id, mapID, name, properties, geometry, geometryType){

		if(!this.featureCollections[layer] || !(this.featureCollections[layer] instanceof GeoJSONFeatureCollection)){
			this.featureCollections[layer] = new GeoJSONFeatureCollection();
		}

		this.featureCollections[layer]
			.addFeature(Utils.extend({
				name     : (name || ''),
				mapID    : mapID,
				layertype: 'icon',
			}, properties))
			.setID(id)
			.setGeometry(geometry, geometryType)
		;

		return this;
	}

	/**
	 * @returns {*}
	 */
	getCollections(){

		// a response to floors
		if(this.floordata.regions){
			this._continent(this.floordata.regions);
		}
		// a regions response
		else if(this.floordata.maps){
			this._region(this.floordata);
		}
		// an actual map response
		else if(this.floordata.points_of_interest){
			this._map(this.floordata);
		}

		return this.featureCollections;
	}

	/**
	 * @param {*} continent
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_continent(continent){
		Object.keys(continent).forEach(regionID => this._region(continent[regionID]));

		return this;
	}

	/**
	 * @param {*} region
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_region(region){

		this._addFeature('region_label', region.id, -1, region.name, {
			type     : 'region',
			layertype: 'label',
		}, region.label_coord);
		/*
		this._addFeature('region_poly', region.id, -1, region.name, {
			type     : 'region',
			layertype: 'poly',
		}, new GW2ContinentRect(region.continent_rect).getPoly(), 'Polygon');
		*/
		Object.keys(region.maps).forEach(mapID => {
			let map = region.maps[mapID];
			map.id  = Utils.intval(mapID);

//			console.log('map', map.id, map.name);
			this._map(map);
		});

		return this;
	}

	/**
	 * @param {*} map
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_map(map){
		let rect = new GW2ContinentRect(map.continent_rect, map.map_rect);
		this.map_rects[map.id] = rect;

		// hack for Labyrinthine Cliffs (922) which has the label set at [0, 0]
		if(!map.label_coord || map.label_coord[0] === 0 || map.label_coord[1] === 0){
			map.label_coord = null;
		}

		// https://github.com/arenanet/api-cdi/issues/334
		this._addFeature('map_label', map.id, map.id, map.name, {
			min_level     : map.min_level,
			max_level     : map.max_level,
			type          : 'map',
			layertype     : 'label',
		}, map.label_coord || rect.getCenter());

		this
			._sectors(map.sectors, map.id)
			._poi(map.points_of_interest, map.id)
			._heropoint(map.skill_challenges, map.id)
		;

		if(this.extraMarkers.length){
			this.extraMarkers.forEach(layer => {

				if(!Utils.isset(() => GW2MAP_EXTRA_LAYERS[layer].data[map.id])){
					return;
				}

				this._extra(GW2MAP_EXTRA_LAYERS[layer], layer, map.id);
			});
		}

		return this;
	}

	/**
	 * @param {*} extra
	 * @param {string} layer
	 * @param {number} mapID
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_extra(extra, layer, mapID){

		extra.data[mapID].forEach(e => {

			let extraOptions = {
				type       : e.type || extra.type,
				layertype  : e.layertype || extra.layertype || 'icon',
				icon       : e.icon || extra.icon || null,
				className  : e.className || extra.className,
				color      : e.color || extra.color,
				description: e.description || extra.description || null
			};

			if(e.antPath || extra.antPath){
				extraOptions.antPath = e.antPath || extra.antPath;
				extraOptions.antColor = e.antColor || extra.antColor;
				extraOptions.antOpacity = e.antOpacity || extra.antOpacity;
				extraOptions.antDashArray = e.antDashArray || extra.antDashArray;
			}

			this._addFeature(
				layer,
				e.id,
				mapID,
				(e.name || extra.name),
				extraOptions,
				e.coord,
				(e.featureType ||extra.featureType || 'Point')
			);
		});

	}

	/**
	 * @param {*} sectors
	 * @param {number} mapID
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_sectors(sectors, mapID){

		Object.keys(sectors).forEach(sectorId =>{
			let sector = sectors[sectorId];

			// allow custom names for wiki disambuguation etc.
			if(Utils.isset(() => GW2W_SECTOR_NAMES[sectorId][this.dataset.language])){
				sector.name = GW2W_SECTOR_NAMES[sectorId][this.dataset.language];
			}

			this._addFeature('sector_label', sector.id, mapID, sector.name, {
				chat_link: sector.chat_link,
				level    : sector.level,
				type     : 'sector',
				layertype: 'label',
			}, sector.coord);

			this._addFeature('sector_poly', sector.id, mapID, sector.name, {
				type     : 'sector',
				layertype: 'poly',
			}, [sector.bounds], 'Polygon');
		});

		return this;
	}

	/**
	 * @param {*} pois
	 * @param {number} mapID
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_poi(pois, mapID){

		Object.keys(pois).forEach(poiID =>{
			let poi = pois[poiID];

			if(Utils.isset(() => GW2W_POI_NAMES[poi.type][poiID][this.dataset.language])){
				poi.name = GW2W_POI_NAMES[poi.type][poiID][this.dataset.language];
			}

			this._addFeature(poi.type + '_icon', poi.id || null, mapID, null, {
				name     : poi.name || poi.id ||  '',
				type     : poi.type,
				chat_link: poi.chat_link || false,
//				floor    : poi.floor, // ???
				icon     : poi.icon
			}, poi.coord);
		});

		return this;
	}

	/**
	 * @param {*} heropoints
	 * @param {number} mapID
	 * @returns {GW2GeoJSON}
	 * @protected
	 */
	_heropoint(heropoints, mapID){

		if(!heropoints.length){
			return this;
		}

		heropoints.forEach(heropoint =>{
			let name = '';

			if(Utils.isset(() => GW2W_HEROPOINT_NAMES[heropoint.id][this.dataset.language])){
				name = GW2W_HEROPOINT_NAMES[heropoint.id][this.dataset.language];
			}

			// https://github.com/arenanet/api-cdi/issues/329
			this._addFeature('heropoint_icon', heropoint.id, mapID, name, {
				type     : 'heropoint',
			}, heropoint.coord)
		});

		return this;
	}

}
