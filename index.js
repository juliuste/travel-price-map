'use strict'

const min = require('lodash.min')
const stations = require('./network.json')
const request = require('isomorphic-fetch')
const moment = require('moment-timezone')
const toArray = require('lodash.toarray')
const findKey = require('lodash.findkey')

const from = {
	db: 8011160,
	mfb: 88
}

mapboxgl.accessToken = "pk.eyJ1IjoiZ3JlZndkYSIsImEiOiJjaXBxeDhxYm8wMDc0aTZucG94d29zdnRyIn0.oKynfvvLSuyxT3PglBMF4w"
const map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/light-v9',
	zoom: 4.67,
	hash: true,
	center: [10.79, 50.03]
})
map.addControl(new mapboxgl.Navigation())

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

const generateMarkerElement = (price, classes) => {
	const div = document.createElement("div")
	div.setAttribute("class", `priceMarker ${classes}`)
	const span = document.createElement("span")
	const text = document.createTextNode(price)
	span.appendChild(text)
	div.appendChild(span)
	return div
}

const getDB = (id) =>
	request(`https://db-prices.juliuste.de?from=${from.db}&to=${id}&date=${moment.tz('Europe/Berlin').add(30, 'days').startOf('day').toISOString()}`, {
		method: 'get'
	})
	.then((res) => res.json())
	.then((res) => Array.filter(res, (r) => r.price && r.price.amount))
	.then((res) => res.map((r) => r.price.amount))
	// .then((res) => {
	// 	if(res.length === 0){throw new Error()}
	// 	return res
	// })
	.then((res) => min(res) || null)
	.catch(() => null)

const getMFB = (id) =>
	request(`https://meinfernbus.juliuste.de/trips?from=${from.mfb}&to=${id}&date=${moment.tz('Europe/Berlin').add(30, 'days').startOf('day').toISOString()}`, {
		method: 'get'
	})
	.then((res) => res.json())
	.then((res) => {console.log(res); return res})
	.then((trips) => trips.map((t) => t.price))
	.then((prices) => min(prices) || null)
	.catch(console.error)
	// .catch(() => null)

const getPrices = (s) =>
	Promise.all([getDB(s.ids.db), getMFB(s.ids.mfb)])
	.then(([db, mfb]) => ({
		db,
		mfb
	}))

const generateLink = (operator, station) => {
	if(operator === 'db'){
		return `https://bahn.guru/calendar?from=${from.db}&to=${station.ids.db}&submit=↳&class=2&bc=0&start=&end=&duration=`
	}
	if(operator === 'mfb'){
		return `https://shop.flixbus.de/search?departureCity=${from.mfb}&arrivalCity=${station.ids.mfb}&_locale=de`
	}
	return null
}

// const formatPrices = (prices) => toArray(prices).filter((price) => !!price).map((price) => `${Math.ceil(price)}€`).join(" | ")
const formatPrices = (prices) => `${Math.ceil(min(toArray(prices).filter((price) => !!price)))}€`

const addStation = (station) =>
	getPrices(station)
	.then((res) => {
		if(toArray(res).some((e) => !!e)){
			const operator = findKey(res, (r) => r && r <= min(toArray(res)))
			const e = generateMarkerElement(formatPrices(res), operator)
			const shopLink = generateLink(operator, station)
			e.addEventListener('click', (e) => window.location.replace(shopLink))
			new mapboxgl.Marker(e/*, {offset: [0, 5]}*/)
			.setLngLat([station.coordinates.longitude, station.coordinates.latitude])
			.addTo(map)
		}
		new map
	})
	.catch((res) => console.error(station, "not working", res))

map.on('load', () => {
	stations.forEach(addStation)
})
meinfernbus(88, 1394, new Date()).then(console.log)
