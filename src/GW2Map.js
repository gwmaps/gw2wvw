/**
 * @filesource   GW2Map.js
 * @created      09.08.2020
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2020 smiley
 * @license      MIT
 */

import GeoJSONFeatureCollection from './util/GeoJSONFeatureCollection';
import GW2MapDataset from './GW2MapDataset';
import GW2GeoJSON from './GW2GeoJSON';
import GW2ContinentRect from './GW2ContinentRect';
import {GW2MAP_I18N} from './i18n/i18n';
import LabelMarker from './leaflet-ext/LabelMarker';
import LabelIcon from './leaflet-ext/LabelIcon';
import PrototypeElement from './util/PrototypeElement';
import Utils from './util/Utils';
// noinspection ES6PreferShortImport
import {
	Control, CRS, DivIcon, GeoJSON, Icon, LatLngBounds, Map, Marker, TileLayer
} from '../node_modules/leaflet/dist/leaflet-src.esm';

export default class GW2Map{

	// common default settings for all maps
	options = {
		containerClassName: 'gw2map',
		navClassName      : 'gw2map-nav',
		lang              : 'en',
		attributionText   : ' &copy; <a href="http://www.arena.net/" target="_blank">ArenaNet</a>',
		padding           : 0.5,
		defaultZoom       : 4,
		minZoom           : 0,
		maxZoom           : 6,
		mapAttribution    : true,
		fullscreenControl : true,
		apiBase           : 'https://api.guildwars2.com',
		tileBase          : 'https://tiles.guildwars2.com',
		tileExt           : 'jpg',
		errorTile         : 'data:image/png;base64,'
			+'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAAAAAB5Gfe6AAAAVElEQVR42u3BAQEAAACAkP6v7ggKAAAA'
			+'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
			+'GAEPAAEccgnDAAAAAElFTkSuQmCC',
		colors            : {
			sector_poly : 'rgba(255, 255, 255, 0.5)',
			sector_team: {
				green  : 'rgba(69, 200, 106, 0.5)',
				blue   : 'rgba(69, 162, 247, 0.5)',
				red    : 'rgba(222, 69, 69, 0.5)',
				neutral: 'rgba(222, 222, 222, 0.5)',
			},
		},
		initLayers: [
			'map_label',
			'objectives',
		],
		linkboxExclude: [],
	};

	// per-map options parsed from the container's dataset
	dataset = {};
	layers  = {};
	tileLayers = {};
	layerControls;
	container;
	map;
	viewRect;
	i18n;

	/**
	 * GW2Map constructor.
	 *
	 * @param {HTMLElement} container
	 * @param {string}      id
	 * @param {Object}      options
	 * @returns {GW2Map}
	 */
	constructor(container, id, options){
		this.container = container;
		this.id        = id;
		this.options   = Utils.extend(this.options, options);
		this.dataset   = new GW2MapDataset(this.container.dataset, this.options).getData();
		this.i18n      = GW2MAP_I18N[this.options.lang] || GW2MAP_I18N['en'];
	}

	/**
	 * initializes the map
	 *
	 * @returns {GW2Map}
	 * @public
	 */
	init(){

		// i hate the Promise/fetch API so much don't @ me
		Promise.all(this._getApiRequestURLs().map(url =>
			fetch(url)
				// check the response
				.then(response => {
					//resolve if it's OK
					if(response.ok){
						return Promise.resolve(response);
					}
					// reject the promise on error
					return Promise.reject(new Error(response.statusText));
				})
				// fetch the response data
				.then(response => response.json())
		))
		.then(responses => this._parseApiResponses(responses))
		.then(featureCollections => this._renderFloor(featureCollections))
		.catch(error => console.log('(╯°□°）╯彡┻━┻ ', error))

		return this;
	}

	/**
	 * @returns {[string]}
	 * @private
	 */
	_getApiRequestURLs(){
		let params = new URLSearchParams();
		// @todo: optional wiki param (does this actually do anything?)
		params.append('wiki', '1');
		params.append('lang', this.dataset.language);

		// build the API URL for the requested floor
		let url = this.options.apiBase + '/v2/continents/2/floors/3/regions/7?' + params.toString();

		return [url];
	}

	/**
	 * @param {[*]} responses
	 * @returns {*}
	 * @private
	 */
	_parseApiResponses(responses){
		// main data is always the first response
		let floordata = responses[0];

		// determine the map bounds for the tile getter
		this.viewRect = [[5120, 8192], [16384, 16384]];

		// transform the response to GeoJSON feature collections - polyfill for https://github.com/arenanet/api-cdi/pull/62
		return new GW2GeoJSON(floordata, this.dataset).getCollections();
	}

	/**
	 * parses the floor data and rencers it on the map
	 *
	 * @param {*} featureCollections
	 * @protected
	 */
	_renderFloor(featureCollections){

		// the map object
		this.map = new Map(this.container, {
			crs               : CRS.Simple,
			minZoom           : this.options.minZoom,
			maxZoom           : this.options.maxZoom,
			zoomControl       : this.dataset.mapControls,
			attributionControl: this.dataset.mapControls && this.options.mapAttribution,
			fullscreenControl : this.dataset.mapControls && this.options.fullscreenControl,
			coordView         : this.options.coordView,
		});

		// the tile layer
		this.tileLayers = new TileLayer('{tilebase}/2/3/{z}/{x}/{y}.{tileExt}', {
			minZoom     : this.options.minZoom,
			maxZoom     : this.options.maxZoom,
			errorTileUrl: this.options.errorTile,
			attribution : this.i18n.attribution + this.options.attributionText,
			bounds      : new LatLngBounds([
				this.map.unproject([this.viewRect[0][0], this.viewRect[1][1]], this.options.maxZoom),
				this.map.unproject([this.viewRect[1][0], this.viewRect[0][1]], this.options.maxZoom)
			]),
			tilebase    : this.options.tileBase,
			tileExt     : this.options.tileExt,
		}).addTo(this.map);

		// add the layer controls
		if(this.dataset.mapControls){
			this.layerControls = new Control.Layers().addTo(this.map);
		}

		// set map center
		let center;
		let coords = this.dataset.centerCoords || [];

		// if coords are given, check if they're valid
		if(coords.length === 2 && coords[0] > 5120 && coords[0] <= 16384 && coords[1] > 8192 && coords[1] <= 16384){
			center = this._p2ll(coords);
		}
		// else get center from the map bounds
		else{
			let rect   = new GW2ContinentRect(this.viewRect).getBounds();
			let bounds = new LatLngBounds(this._p2ll(rect[0]), this._p2ll(rect[1])).pad(this.options.padding);
			center     = bounds.getCenter();
		}

		this.map.setView(center, this.dataset.zoom);

		// create overlay panes
		let panes      = Object.keys(featureCollections);
		let initLayers = this.dataset.initLayers || this.options.initLayers || panes;

		panes.forEach(pane => this._createPane(featureCollections[pane], pane, initLayers));

		// add an event to adjust icon sizes on zoom
		this.map.on('zoomend', ev => this._zoomEndEvent());
		// invoke once to set the icon zoom on the newly created map
		this._zoomEndEvent();
	}

	/**
	 * handles leaflet's zoomEnd event, adjusts icon sizes and label positions
	 *
	 * @protected
	 */
	_zoomEndEvent(){
		let zoom = this.map.getZoom();

		Object.keys(this.layers).forEach(layer => {
			let el = this.layers[layer].options.pane;

			if(zoom >= 5){
				PrototypeElement.removeClassName(el, 'half');
			}
			else if(zoom < 5 && zoom >= 3){
				PrototypeElement.removeClassName(el, 'quarter');
				PrototypeElement.addClassName(el, 'half');
			}

			else if(zoom < 3 && zoom >= 1){
				PrototypeElement.removeClassName(el, 'half');
				PrototypeElement.removeClassName(el, 'invis');
				PrototypeElement.addClassName(el, 'quarter');
			}
			else if(zoom < 1){
				PrototypeElement.removeClassName(el, 'quarter');
				PrototypeElement.addClassName(el, 'invis');
			}

			// i hate this.
			if(Utils.in_array(layer, ['map_label', 'sector_label'])){
				Object.keys(el.children).forEach(c => {
					let origin = window.getComputedStyle(el.children[c]).perspectiveOrigin.split(' ');

					el.children[c].style.left = '-'+origin[0];
					el.children[c].style.top  = '-'+origin[1];
				});
			}

		});

	}

	/**
	 * creates a layer pane and adds data to it
	 *
	 * @param {GeoJSONFeatureCollection} featureCollection
	 * @param {string} pane
	 * @param {string[]}initLayers
	 * @protected
	 */
	_createPane(featureCollection, pane, initLayers){

		if(!(featureCollection instanceof GeoJSONFeatureCollection)){
			return;
		}

		let geojson = featureCollection.getJSON()

		// don't create empty layers
		if(!geojson.features.length){
			return;
		}

		let name = '<span class="gw2map-layer-control '+ pane +'">&nbsp;</span> ' + this.i18n.layers[pane];

		// create the pane if it doesn't exist
		if(!this.layers[pane]){
			this.layers[pane] = new GeoJSON(geojson, {
				pane          : this.map.createPane(pane),
				coordsToLatLng: coords => this._p2ll(coords),
				pointToLayer  : (feature, coords) => this._pointToLayer(feature, coords, pane),
				onEachFeature : (feature, layer) => this._onEachFeature(feature, layer, pane),
				style         : (feature) => this._layerStyle(feature, pane),
			});

			this.layerControls.addOverlay(this.layers[pane], name)
		}
		// otherwise just add the data
		else{
			this.layers[pane].addData(geojson);
		}

		// optionally show that layer on the map
		if(Utils.in_array(pane, initLayers)){
			this.layers[pane].addTo(this.map);
		}
	}

	/**
	 * prepares the infobox/popup content
	 *
	 * @link  http://leafletjs.com/reference-1.6.0.html#geojson-oneachfeature
	 * @param {*}      feature
	 * @param {Layer}  layer
	 * @param {string} pane
	 * @protected
	 */
	_onEachFeature(feature, layer, pane){
		let p       = feature.properties;
		let content = '';

		// add icon
		if(p.layertype === 'icon'){
			content += p.icon
				? '<img class="gw2map-popup-icon gw2map-layer-control" src="' + p.icon + '" alt="' + p.name + '"/>'
				: '<span class="gw2map-layer-control ' + pane + '" ></span>';
		}

		// add name, normalize to wiki article names if possible
		if(p.name){
			content += !['vista'].includes(p.type)
				? this._wikiLinkName(p.name)
				: p.name;
		}

		// add content level
		if(p.level){
			content += ' (' + p.level + ')';
		}
		else if(p.min_level && p.max_level){
			content += ' (' + (p.min_level === p.max_level ? p.max_level : p.min_level + '-' + p.max_level) + ')';
		}

		// create a chatlink input
		if(p.chat_link){

			if(content){
				content += '<br>';
			}

			content += '<input class="gw2map-chatlink" type="text" value="' + p.chat_link
				+ '" readonly="readonly" onclick="this.select();return false;" />';
		}

		// add a description text with parsed wiki links
		if(p.description){

			if(content){
				content += '<br>';
			}

			content += '<div class="gw2map-description">' + this._parseWikilinks(p.description) + '</div>';
		}

		// finally bind the popup
		if(content){
			layer.bindPopup(content);
		}

	}

	/**
	 *
	 * @param name
	 * @returns {string}
	 * @private
	 */
	_wikiLinkName(name){
		//noinspection RegExpRedundantEscape
		let wikiname = name.toString().replace(/\.$/, '').replace(/\s/g, '_');

		return '<a class="gw2map-wikilink" href="'
			+ this.i18n.wiki + encodeURIComponent(wikiname)
			+ '" target="_blank">' + name + '</a>';
	}

	/**
	 * a simple parser that allows creating links in popup texts using wikicode: [[article]] and [[article|name]]
	 *
	 * @param {string} str
	 * @returns {string}
	 * @protected
	 */
	_parseWikilinks(str){
		// noinspection RegExpRedundantEscape
		return str
			.replace(/\[\[([^\]\|]+)\]\]/gi, '<a href="' + this.i18n.wiki + '$1" target="_blank">$1</a>')
			.replace(/\[\[([^\|]+)(\|)([^\]]+)\]\]/gi, '<a href="' + this.i18n.wiki + '$1" target="_blank">$3</a>');
	}

	/**
	 * handle layer icons/markers
	 *
	 * @link  http://leafletjs.com/reference-1.6.0.html#geojson-pointtolayer
	 * @param {*}      feature
	 * @param {LatLng} coords
	 * @param {string} pane
	 * @protected
	 */
	_pointToLayer(feature, coords, pane){
		let icon;
		let p = feature.properties;

		// common settings for all markers
		let iconParams = {
			pane: pane,
			iconSize   : null,
			popupAnchor: 'auto',
			// temporarily adding the "completed" classname
			// https://discordapp.com/channels/384735285197537290/384735523521953792/623750587921465364
			// @todo: include type/layertype only when non-empty
			className: 'gw2map-' + p.layertype + ' gw2map-' + p.type + '-' + p.layertype + ' completed'
		};

		// icon url is given via the geojson feature
		if(p.icon){
			iconParams.iconUrl = p.icon;

			if(p.className){
				iconParams.className += ' ' + p.className;
			}

			icon = new Icon(iconParams);
		}
		// the icon is actually a label text
		else if(p.layertype === 'label'){
			iconParams.html       = p.name;
			iconParams.iconAnchor = 'auto';

			icon = new LabelIcon(iconParams);

			return new LabelMarker(coords, {
				pane: pane,
				title: p.name,
				icon: icon
			});
		}
		// else create a div icon with a classname depending on the type
		else{

			if(p.type === 'heropoint'){
				iconParams.className += p.id.split('-')[0] === '0' ? ' core' : ' expac';
			}
			else if(p.type === 'marker' && p.className){
				iconParams.className += ' ' + p.className
			}

			icon = new DivIcon(iconParams);
		}

		// finally create the marker
		return new Marker(coords, {
			pane: pane,
			title: p.layertype === 'icon' ? p.name : null,
			icon: icon
		});
	}

	/**
	 * Polygon/Polyline styles
	 *
	 * @link  http://leafletjs.com/reference-1.6.0.html#geojson-style
	 * @param {*}      feature
	 * @param {string} pane
	 * @protected
	 */
	_layerStyle(feature, pane){
		let p = feature.properties;

		if(['region_poly', 'map_poly', 'sector_poly'].includes(pane)){
			let color = this.options.colors[pane] || 'rgb(255, 255, 255)';

			// fixed sector colors
			if(pane === 'sector_poly'){
				if([850, 993, 974, 1350].includes(feature.id)){
					color = this.options.colors.sector_team.green;
				}
				else if([836, 980, 1000, 1311].includes(feature.id)){
					color = this.options.colors.sector_team.blue;
				}
				else if([845, 977, 997, 1343].includes(feature.id)){
					color = this.options.colors.sector_team.red;
				}
			}

			return {
				pane: pane,
				stroke: true,
				opacity: 0.6,
				color: color,
				weight: 2,
				interactive: false,
			}
		}

		return {
			pane: pane,
			stroke: true,
			opacity: 0.6,
			color: p.color || 'rgb(255, 255, 255)',
			weight: 3,
			interactive: true,
		}
	}

	/**
	 * @param {[*,*]} coords
	 * @returns {LatLng}
	 * @protected
	 */
	_p2ll(coords){
		return this.map.unproject(coords, this.options.maxZoom);
	}

}
