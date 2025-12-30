---
description: marker-clustering Agrupar markers con react-leaflet-cluster
---

import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  const maxSeverity = Math.max(...markers.map(m => m.options.severity));

  const severityClass =
    maxSeverity >= 80 ? 'cluster-severe' :
    maxSeverity >= 60 ? 'cluster-critical' :
    maxSeverity >= 40 ? 'cluster-high' : 'cluster-low';

  return L.divIcon({
    html: `<div class="cluster-marker ${severityClass}">
      <span>${count}</span>
    </div>`,
    className: '',
  });
};

export function WazeAlertsLayer({ alerts }: Props) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      disableClusteringAtZoom={18}
      iconCreateFunction={createClusterIcon}
    >
      {alerts.map(alert => (
        <WazeMarker key={alert.uuid} alert={alert} />
      ))}
    </MarkerClusterGroup>
  );
}
Config:

chunkedLoading: true (performance)
maxClusterRadius: 50px
disableClusteringAtZoom: 18 (mostrar individuales)
