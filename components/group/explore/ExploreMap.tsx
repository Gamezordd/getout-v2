import { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import mapboxgl from "mapbox-gl";
import type { ExploreStore } from "@/stores/ExploreStore";
import type { MapPlace } from "@/types/explore";
import type { Coordinates } from "@/types/location";

type Props = {
  store: ExploreStore;
  groupId: string;
  centroid: Coordinates;
  pinnedIds: Set<string>;
};

const MAP_PLACE_COUNT = 20;

const RADIUS_SOURCE = "search-radius";
const RADIUS_FILL_LAYER = "search-radius-fill";
const RADIUS_OUTLINE_LAYER = "search-radius-outline";

function zoomToRadius(zoom: number): number {
  return Math.max(200, Math.round(20000 / Math.pow(4, (zoom - 10) / 2)));
}

/** Approximate GeoJSON circle polygon for a given center + radius in meters. */
function makeCircleGeoJSON(lat: number, lng: number, radiusMeters: number) {
  const steps = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusMeters / 111320) * Math.sin(angle);
    const dLng = (radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [coords] }, properties: {} };
}

function areaKey(lat: number, lng: number): string {
  return `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;
}

function createMarkerEl(
  place: MapPlace,
  isPinned: boolean,
  isSelected: boolean,
): HTMLElement {
  // root has no transition — Mapbox sets style.transform on this element to position it,
  // so any CSS transition here would make markers lag behind the map during pan/zoom.
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;";

  // inner carries the hover scale transition, isolated from Mapbox's positioning transform
  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;align-items:center;transform-origin:bottom center;transition:transform .12s;";

  const pill = document.createElement("div");
  pill.style.cssText = `
    display:flex;align-items:center;gap:5px;
    padding:5px 10px;border-radius:20px;font-family:inherit;font-size:11px;font-weight:700;
    white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,.5);transition:all .15s;
    ${isPinned
      ? "background:rgba(255,190,61,.18);border:1px solid rgba(255,190,61,.45);color:#ffbe3d;"
      : isSelected
        ? "background:#00e5a0;color:#000;border:1px solid transparent;"
        : "background:#141418;border:1px solid rgba(255,255,255,.07);color:#f0f0f5;"
    }
  `;

  const nameSpan = document.createElement("span");
  nameSpan.textContent = (isPinned ? "📌 " : "") + place.name.split(" ").slice(0, 2).join(" ");
  pill.appendChild(nameSpan);

  const metaColor = isPinned ? "rgba(255,190,61,.7)" : isSelected ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.4)";

  if (place.rating && place.rating !== "New") {
    const sep = document.createElement("span");
    sep.textContent = "·";
    sep.style.cssText = `color:${metaColor};font-weight:400;`;

    const ratingSpan = document.createElement("span");
    const stars = Math.round(parseFloat(place.rating));
    ratingSpan.textContent = "★".repeat(stars) + "☆".repeat(Math.max(0, 5 - stars));
    ratingSpan.style.cssText = `font-size:9px;letter-spacing:0.5px;color:${metaColor};`;
    pill.append(sep, ratingSpan);
  }

  if (place.priceLevel !== undefined && place.priceLevel > 0) {
    const sep2 = document.createElement("span");
    sep2.textContent = "·";
    sep2.style.cssText = `color:${metaColor};font-weight:400;`;

    const priceSpan = document.createElement("span");
    priceSpan.textContent = "$".repeat(place.priceLevel);
    priceSpan.style.cssText = `font-size:10px;color:${metaColor};`;
    pill.append(sep2, priceSpan);
  }

  const tail = document.createElement("div");
  tail.style.cssText = `width:2px;height:6px;margin-top:-1px;border-radius:0 0 2px 2px;opacity:.5;background:${
    isPinned ? "#ffbe3d" : isSelected ? "#00e5a0" : "#5a5a70"
  };`;

  inner.append(pill, tail);
  root.append(inner);
  root.addEventListener("mouseenter", () => { inner.style.transform = "scale(1.05)"; });
  root.addEventListener("mouseleave", () => { inner.style.transform = ""; });
  return root;
}

function createCentroidEl(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "width:32px;height:32px;display:flex;align-items:center;justify-content:center;pointer-events:none;";

  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position:absolute;width:32px;height:32px;border-radius:50%;
    background:rgba(0,229,160,.15);border:1px solid rgba(0,229,160,.35);
    animation:centroid-pulse 2s ease-out infinite;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width:10px;height:10px;border-radius:50%;
    background:#00e5a0;border:2px solid #000;
    box-shadow:0 0 6px rgba(0,229,160,.6);
    position:relative;z-index:1;
  `;

  wrapper.append(pulse, dot);
  return wrapper;
}

const ExploreMap = observer(function ExploreMap({ store, groupId, centroid, pinnedIds }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const markersRef = useRef<Map<string, any>>(new Map());
  const centroidMarkerRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const isReadyRef = useRef(false);

  const updateRadiusCircle = useCallback((lat: number, lng: number, zoom: number) => {
    const map = mapRef.current;
    if (!map || !isReadyRef.current) return;
    const radiusMeters = zoomToRadius(zoom);
    const geojson = makeCircleGeoJSON(lat, lng, radiusMeters);
    const source = map.getSource(RADIUS_SOURCE);
    if (source) {
      source.setData(geojson);
    }
  }, []);

  const fetchPlaces = useCallback(async (lat: number, lng: number, zoom: number) => {
    const key = areaKey(lat, lng);
    if (store.hasAreaBeenFetched(key)) return;
    store.markAreaFetched(key);
    updateRadiusCircle(lat, lng, zoom);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        zoom: String(zoom),
        count: String(MAP_PLACE_COUNT),
      });
      const res = await fetch(`/api/groups/${groupId}/map-places?${params}`);
      if (!res.ok) return;
      const payload = await res.json() as { data?: MapPlace[] };
      if (payload.data) store.addPlaces(payload.data);
    } catch {
      // network error — silently ignore
    }
  }, [groupId, store, updateRadiusCircle]);

  // Init map — deferred one frame so flex layout resolves before Mapbox measures the container
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    let rafId: number;
    let ro: ResizeObserver | null = null;

    rafId = requestAnimationFrame(() => {
      try {
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
        if (!containerRef.current || !mapHostRef.current) return;

        const map = new mapboxgl.Map({
          container: mapHostRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [centroid.lng, centroid.lat],
          zoom: 14,
        });
        mapRef.current = map;

        // Resize map whenever the outer container changes size (e.g. tab re-mount)
        ro = new ResizeObserver(() => map.resize());
        ro.observe(containerRef.current);

        // Inject keyframe animation for the centroid pulse
        if (!document.getElementById("centroid-pulse-style")) {
          const style = document.createElement("style");
          style.id = "centroid-pulse-style";
          style.textContent = `@keyframes centroid-pulse{0%{transform:scale(1);opacity:.8}70%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:0}}`;
          document.head.appendChild(style);
        }

        map.on("load", () => {
          isReadyRef.current = true;
          map.resize();

          // Radius circle layers
          map.addSource(RADIUS_SOURCE, {
            type: "geojson",
            data: makeCircleGeoJSON(centroid.lat, centroid.lng, zoomToRadius(14)),
          });
          map.addLayer({
            id: RADIUS_FILL_LAYER,
            type: "fill",
            source: RADIUS_SOURCE,
            paint: { "fill-color": "#00e5a0", "fill-opacity": 0.06 },
          });
          map.addLayer({
            id: RADIUS_OUTLINE_LAYER,
            type: "line",
            source: RADIUS_SOURCE,
            paint: { "line-color": "#00e5a0", "line-opacity": 0.35, "line-width": 1.5, "line-dasharray": [3, 4] },
          });

          // Centroid marker
          const centroidEl = createCentroidEl();
          centroidMarkerRef.current = new mapboxgl.Marker({ element: centroidEl, anchor: "center" })
            .setLngLat([centroid.lng, centroid.lat])
            .addTo(map);

          fetchPlaces(centroid.lat, centroid.lng, 14);
        });

        map.on("moveend", () => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            updateRadiusCircle(center.lat, center.lng, zoom);
            fetchPlaces(center.lat, center.lng, zoom);
          }, 600);
        });

        // Update circle outline during active pan/zoom for live feedback
        map.on("move", () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          updateRadiusCircle(center.lat, center.lng, zoom);
        });
      } catch (err) {
        console.error("Map init failed", err);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      initializedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever places, selection, or pins change
  const placesKey = Array.from(store.places.keys()).join(",");
  const selectedId = store.selectedPlaceId;
  const pinnedKey = Array.from(pinnedIds).join(",");

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReadyRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const place of store.places.values()) {
      const isPinned = pinnedIds.has(place.id);
      const isSelected = place.id === selectedId;
      const el = createMarkerEl(place, isPinned, isSelected);
      el.addEventListener("click", () => store.setSelectedPlace(
        place.id === store.selectedPlaceId ? null : place.id,
      ));
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .addTo(map);
      markersRef.current.set(place.id, marker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey, selectedId, pinnedKey]);

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="absolute inset-0">
        <div ref={mapHostRef} className="w-full h-full" />
      </div>
      {/* Zoom controls */}
      <div className="absolute right-[12px] top-[12px] flex flex-col gap-[6px] z-10">
        {["+", "−"].map((label, i) => (
          <button
            key={label}
            onClick={() => mapRef.current?.zoomTo(mapRef.current.getZoom() + (i === 0 ? 1 : -1))}
            className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(20,20,24,.9)] backdrop-blur-md border border-white/10 flex items-center justify-center text-ink font-light text-[17px]"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => mapRef.current?.flyTo({ center: [centroid.lng, centroid.lat], zoom: 14 })}
          className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(20,20,24,.9)] backdrop-blur-md border border-white/10 flex items-center justify-center text-ink"
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/></svg>
        </button>
      </div>
    </div>
  );
});

export default ExploreMap;
