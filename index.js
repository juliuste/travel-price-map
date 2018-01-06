'use strict'

const min = require('lodash.min')
const request = require('isomorphic-fetch')
const toArray = require('lodash.toarray')
const findKey = require('lodash.findkey')

let origins = ["DEBER", "DEFRA", "DECGN", "DEHAM", "DELEI", "DEMUN"]

const cv = document.querySelector('#cities').value
const startOrigin = origins.indexOf(cv) >= 0 ? cv : "DEBER"

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

const generateMarkerElement = (origin, price, classes, shopLink) => {
	const div = document.createElement("div")
	div.setAttribute("class", origin+" priceMarker")
	const a = document.createElement("a")
	a.setAttribute("class", `priceLink ${classes}`)
	a.setAttribute("href", shopLink)
	const text = document.createTextNode(price)
	a.appendChild(text)
	div.appendChild(a)
	div.hidden = true
	return div
}

// const formatPrices = (prices) => toArray(prices).filter((price) => !!price).map((price) => `${Math.ceil(price)}€`).join(" | ")
const formatPrices = (prices) => `${Math.ceil(min(toArray(prices).filter((price) => !!price).map((x) => x.amount)))}€`

const getPriceData = (originCode) =>
	request(`https://api.pricemap.eu/?origin=${originCode}`, {
		method: 'get'
	})
	.then((res) => res.json())

const addStation = (origin) => (station) => {
	if(toArray(station.prices).some((e) => !!e)){
		const operator = findKey(station.prices, (r) => r && r.amount <= min(toArray(station.prices).map((x) => x ? x.amount : null)))
		const e = generateMarkerElement(origin, formatPrices(station.prices), operator, station.prices[operator].link)
		new mapboxgl.Marker(e/*, {offset: [0, 5]}*/)
		.setLngLat([station.coordinates.longitude, station.coordinates.latitude])
		.addTo(map)
	}
}

map.on('load', () => {
	const r = []
	for(let origin of origins){
		r.push(getPriceData(origin)
		.then((stations) => {
			stations.forEach(addStation(origin))
		}))
	}
	Promise.all(r).then(() => select(startOrigin))
	document.querySelector('.mapboxgl-ctrl-attrib').innerHTML = '<b><a href="https://juliustens.eu/impressum.html">Impressum</a></b> ' + document.querySelector('.mapboxgl-ctrl-attrib').innerHTML
})

const select = (origin) => {
	if(origins.indexOf(origin)>=0){
		document.querySelectorAll('.priceMarker').forEach((el) => {
			if(Array.from(el.classList).indexOf(origin) < 0) el.hidden = true
			else el.hidden = false
		})
	}
}

document.querySelector('#cities').addEventListener('change', (e) => {
	select(e.target.value)
})
