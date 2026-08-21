<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  lat: number
  lng: number
  zoom?: number
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

onMounted(() => {
  if (!mapContainer.value) return

  // Initialize map
  map = L.map(mapContainer.value, {
    center: [props.lat, props.lng],
    zoom: props.zoom || 14,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false
  })

  // Add CARTO Positron tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map)

  // Clean vector marker (avoids default Leaflet marker image missing issues)
  const customIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-4 h-4 bg-orange-500 rounded-full border-[3px] border-white shadow-md shadow-black/20"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

  marker = L.marker([props.lat, props.lng], { icon: customIcon }).addTo(map)
})

watch(() => [props.lat, props.lng], () => {
  if (map && marker) {
    const latlng: [number, number] = [props.lat, props.lng]
    map.setView(latlng)
    marker.setLatLng(latlng)
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div class="relative w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-50 group">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    
    <!-- Click overlay to open full map in new tab -->
    <a 
      :href="`https://www.google.com/maps?q=${lat},${lng}`" 
      target="_blank"
      class="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/5 transition-colors cursor-pointer"
      title="Open in Google Maps"
    >
      <span class="opacity-0 group-hover:opacity-100 bg-white/95 text-stone-900 text-xs px-2.5 py-1.5 rounded-md shadow-sm transition-opacity font-medium">
        Open in Google Maps
      </span>
    </a>
  </div>
</template>
