'use strict'

const min = require('lodash.min')
const request = require('isomorphic-fetch')
const toArray = require('lodash.toarray')
const findKey = require('lodash.findkey')

const origin = "DEBER"

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

// const formatPrices = (prices) => toArray(prices).filter((price) => !!price).map((price) => `${Math.ceil(price)}€`).join(" | ")
const formatPrices = (prices) => `${Math.ceil(min(toArray(prices).filter((price) => !!price).map((x) => x.amount)))}€`

const getPriceData = (originCode) =>
	request(`https://travel-price-map-rest.juliuste.de/?origin=${originCode}`, {
		method: 'get'
	})
	.then((res) => res.json())

const addStation = (station) => {
	if(toArray(station.prices).some((e) => !!e)){
		const operator = findKey(station.prices, (r) => r && r.amount <= min(toArray(station.prices).map((x) => x ? x.amount : null)))
		const e = generateMarkerElement(formatPrices(station.prices), operator)
		e.addEventListener('click', (e) => {window.location.href = station.shopLink})
		new mapboxgl.Marker(e/*, {offset: [0, 5]}*/)
		.setLngLat([station.coordinates.longitude, station.coordinates.latitude])
		.addTo(map)
	}
}

map.on('load', () => {
	getPriceData(origin)
	.then((stations) => {
		stations.forEach(addStation)
	})
})
