# Geographic Map Features

## Overview
The Geographic Overview section now includes an interactive map built with Mapbox GL that visualizes census tract data and facility locations across Washington state.

## Features

### Census Tract Visualization
- **0.6 Opacity**: All census tracts are displayed with 60% opacity by default
- **Polygon Display**: Census tract boundaries are shown as polygons with white borders
- **Data Layers**: Toggle between different data visualizations:
  - **Poverty Rate**: Color-coded based on poverty percentage (green=low, yellow=medium, red=high)
  - **Race Demographics**: Color-coded based on white population percentage
  - **Population**: Color-coded based on total population density
  - **Community Risk**: Placeholder for community risk data
  - **Disability**: Placeholder for disability data

### Selection Functionality
- **Enable Selection Button**: Toggle selection mode on/off
- **Single Click Selection**: Click on any census tract to select/deselect it
- **Box Selection**: Click and drag to create a selection box that selects all tracts within the area
- **Clear Selection**: Button to clear all selected tracts
- **Visual Feedback**: Selected tracts are highlighted in red with increased opacity

### Facility Markers
- **Child Care Centers**: Green circular markers that can be clicked to select
- **Nursing Homes**: Red circular markers that can be clicked to select
- **Toggle Visibility**: Buttons to show/hide each facility type
- **Clickable**: Click on any facility marker to select/deselect it

### Facility Risk Overview
- **Most Populous Facilities**: Shows the top 5 most populous facilities of each type
- **Risk Assessment**: Color-coded risk levels (green=low, yellow=medium, red=high)
- **Selection Summary**: Displays counts of selected tracts and facilities
- **Interactive**: Clicking on facilities in the map updates the overview panel

## Data Sources
- **Census Tracts**: `UnderlyingStateData/washington_tracts_base_optimized.geojson`
- **Poverty Data**: `UnderlyingStateData/washington_tracts_poverty.json`
- **Race Data**: `UnderlyingStateData/washington_tracts_race.json`
- **Demographics**: `UnderlyingStateData/washington_tracts_demographics.json`
- **Child Care Centers**: `UnderlyingStateData/Child_Care_Centers.geojson`
- **Nursing Homes**: `UnderlyingStateData/Nursing_Homes.geojson`

## Technical Implementation
- **Leaflet**: Uses Leaflet.js for lightweight, interactive maps
- **React Leaflet**: React wrapper for Leaflet integration
- **OpenStreetMap**: Uses OpenStreetMap tiles for the base layer
- **Responsive Design**: Map adapts to different screen sizes
- **Performance Optimized**: Data is loaded in parallel and cached
- **Browser Compatible**: Works in all modern browsers without WebGL requirements

## Usage
1. **View Data**: Use the layer buttons to switch between different data visualizations
2. **Enable Selection**: Click "Enable Selection" to start selecting tracts
3. **Select Tracts**: Click individual tracts or drag to select multiple tracts
4. **View Facilities**: Toggle child care centers and nursing homes on/off
5. **Analyze Risk**: Review the Facility Risk Overview panel for selected areas
6. **Clear Selection**: Use the "Clear Selection" button to reset

## Future Enhancements
- Spatial intersection analysis for facility-tract relationships
- Additional data layers (transportation, healthcare access, etc.)
- Export functionality for selected areas
- Real-time data integration
- Advanced filtering and search capabilities
