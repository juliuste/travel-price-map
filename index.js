'use strict'

const min = require('lodash/min')
const request = require('isomorphic-fetch')
const toArray = require('lodash/toArray')
const findKey = require('lodash/findKey')
const toPairs = require('lodash/toPairs')
const alert = require('sweetalert2')
const mapLibre = require('maplibre-gl')
const queryState = require('querystate')()
const { boolean } = require('boolean')

const origins = ['DEBER', 'DEFRA', 'DEHAM', 'DECGN', 'DEMUN', 'DELEI', 'PLWAR', 'PLLOD', 'PLGDA', 'PLWRO', 'PLKRA']

const startOrigin = (queryState.get('origin') && origins.includes(queryState.get('origin'))) ? queryState.get('origin') : 'DEBER'
queryState.set('origin', startOrigin)
document.addEventListener('DOMContentLoaded', () => { document.querySelector('#cities').value = startOrigin })

const mapTilerKey = '0gVQZrq3O37rirjPt3wq'
const map = new mapLibre.Map({
	container: 'map',
	style: `https://api.maptiler.com/maps/pastel/style.json?key=${mapTilerKey}`,
	zoom: 4.67,
	center: [14.08, 50.54],
	attributionControl: true,
	customAttribution: [
		'<b><a href="https://github.com/juliuste/travel-price-map">GitHub</a></b>',
		'<b><a href="https://bahn.guru/impressum">Impressum</a></b>',
	],
})
map.addControl(new mapLibre.NavigationControl())

// automatically resize map to always match the window's size
const el = document.getElementById('map')
const resize = () => {
	const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
	const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
	el.style.width = w + 'px'
	el.style.height = h + 'px'
	map.resize()
}
resize()
window.addEventListener('resize', resize)

const generateMarkerElement = (origin, price, classes, shopLink) => {
	const div = document.createElement('div')
	div.setAttribute('class', origin + ' priceMarker')
	const a = document.createElement('a')
	a.setAttribute('class', `priceLink ${classes}`)
	a.setAttribute('href', shopLink)
	// warning for flix ticket prices
	if (classes === 'flix') {
		a.addEventListener('click', (e) => {
			e.preventDefault()
			alert.fire({
				title: 'Please note',
				text: "Some offers by Flixbus are only available in the app. If you can't find the displayed fare on the website, please check again using the app.",
				confirmButtonText: 'Continue',
				confirmButtonColor: '#3085d6',
				icon: 'success',
			})
				.then(() => { window.open(shopLink, '_blank') })
		})
	}
	// warning for db ticket prices
	if (classes === 'db') {
		a.addEventListener('click', (e) => {
			e.preventDefault()
			alert.fire({
				title: 'Please note',
				text: "Some offers by Deutsche Bahn are only available in the app. If you can't find the displayed fare on the website, please check again using the DB Navigator app.",
				confirmButtonText: 'Continue',
				confirmButtonColor: '#3085d6',
				icon: 'success',
			})
				.then(() => { window.open(shopLink, '_blank') })
		})
	}
	const text = document.createTextNode(price)
	a.appendChild(text)
	div.appendChild(a)
	div.hidden = true
	return div
}

const formatPrice = (amount) => `${Math.ceil(amount)}€`

const getPriceData = (originCode) =>
	request(`https://api.pricemap.eu/?origin=${originCode}`, {
		method: 'get',
	})
		.then((res) => res.json())

const addStation = (origin, dbOnly) => (station) => {
	if (toPairs(station.prices).some(([operator, value]) => (!!value && (!dbOnly || operator === 'db')))) {
		const operator = dbOnly ? 'db' : findKey(station.prices, (r) => r && r.amount <= min(toArray(station.prices).map((x) => x ? x.amount : null)))
		const { amount, link } = station.prices[operator]
		const e = generateMarkerElement(origin, formatPrice(amount), operator, link)
		new mapLibre.Marker({
			element: e,
			anchor: 'top-left',
		})
			.setLngLat([station.coordinates.longitude, station.coordinates.latitude])
			.addTo(map)
	}
}

map.on('load', () => {
	const dbOnly = boolean(queryState.get('dbOnly'))
	const r = []
	for (const origin of origins) {
		r.push(getPriceData(origin)
			.then((stations) => {
				stations.forEach(addStation(origin, dbOnly))
			}))
	}
	Promise.all(r).then(() => select(startOrigin))
})

const select = (origin) => {
	if (origins.indexOf(origin) >= 0) {
		document.querySelectorAll('.priceMarker').forEach((el) => {
			if (Array.from(el.classList).indexOf(origin) < 0) el.hidden = true
			else el.hidden = false
		})
	}
}

document.querySelector('#cities').addEventListener('change', (e) => {
	const city = e.target.value
	queryState.set('origin', city)
	select(city)
})
