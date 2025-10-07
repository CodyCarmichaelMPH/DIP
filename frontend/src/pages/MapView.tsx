import { useState, useMemo, useCallback } from 'react'
import { Building2, Home, Heart } from 'lucide-react'
import FacilityMap from '../components/FacilityMap'
import type L from 'leaflet'

export function MapView() {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [facilities, setFacilities] = useState<{
    childCare: any[];
    nursing: any[];
    hospitals: any[];
  }>({ childCare: [], nursing: [], hospitals: [] });

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleFacilitiesLoad = useCallback((loadedFacilities: {
    childCare: any[];
    nursing: any[];
    hospitals: any[];
  }) => {
    setFacilities(loadedFacilities);
  }, []);

  // Filter facilities by map bounds and get top 5 by population
  const visibleFacilities = useMemo(() => {
    if (!mapBounds) return { childCare: [], nursing: [], hospitals: [] };

    const filterAndSort = (facilityList: any[]) => {
      return facilityList
        .filter(facility => {
          const coords = facility.geometry?.coordinates;
          if (!coords || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return mapBounds.contains([lat, lng]);
        })
        .sort((a, b) => {
          const popA = a.properties?.POPULATION || a.properties?.TOT_RES || a.properties?.BEDS || 0;
          const popB = b.properties?.POPULATION || b.properties?.TOT_RES || b.properties?.BEDS || 0;
          return popB - popA;
        })
        .slice(0, 5);
    };

    return {
      childCare: filterAndSort(facilities.childCare),
      nursing: filterAndSort(facilities.nursing),
      hospitals: filterAndSort(facilities.hospitals)
    };
  }, [mapBounds, facilities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Map View (Alpha)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Geographic analysis and facility mapping
          </p>
        </div>
      </div>

      {/* Geographic Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Geographic Overview</h3>
            </div>
            <FacilityMap 
              onBoundsChange={handleBoundsChange}
              onFacilitiesLoad={handleFacilitiesLoad}
            />
          </div>
        </div>

        {/* Facility Risk Overview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Facility Risk Overview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Top 5 facilities in current map view by population</p>
            
            <div className="space-y-6">
              {/* Child Care Centers */}
              <div>
                <div className="flex items-center mb-3">
                  <Building2 className="h-4 w-4 text-green-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Child Care Centers</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.childCare.length})</span>
                </div>
                {visibleFacilities.childCare.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.childCare.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-green-500 pl-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.POPULATION || facility.properties?.TOT_RES || facility.properties?.BEDS) && (
                          <div className="mt-1 font-semibold text-green-700">
                            Pop: {facility.properties?.POPULATION || facility.properties?.TOT_RES || facility.properties?.BEDS}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>

              {/* Nursing Homes */}
              <div>
                <div className="flex items-center mb-3">
                  <Home className="h-4 w-4 text-orange-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Nursing Homes</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.nursing.length})</span>
                </div>
                {visibleFacilities.nursing.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.nursing.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-orange-500 pl-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.TOT_RES || facility.properties?.BEDS || facility.properties?.POPULATION) && (
                          <div className="mt-1 font-semibold text-orange-700">
                            Pop: {facility.properties?.TOT_RES || facility.properties?.BEDS || facility.properties?.POPULATION}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>

              {/* Hospitals */}
              <div>
                <div className="flex items-center mb-3">
                  <Heart className="h-4 w-4 text-red-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Hospitals</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.hospitals.length})</span>
                </div>
                {visibleFacilities.hospitals.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.hospitals.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-red-500 pl-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        {facility.properties?.TYPE && (
                          <div className="text-gray-700 dark:text-gray-300 font-medium">Type: {facility.properties.TYPE}</div>
                        )}
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.BEDS || facility.properties?.POPULATION) && (
                          <div className="mt-1 font-semibold text-red-700">
                            {facility.properties?.BEDS ? `Beds: ${facility.properties.BEDS}` : `Pop: ${facility.properties?.POPULATION}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

      childCare: filterAndSort(facilities.childCare),
      nursing: filterAndSort(facilities.nursing),
      hospitals: filterAndSort(facilities.hospitals)
    };
  }, [mapBounds, facilities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Map View (Alpha)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Geographic analysis and facility mapping
          </p>
        </div>
      </div>

      {/* Geographic Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Geographic Overview</h3>
            </div>
            <FacilityMap 
              onBoundsChange={handleBoundsChange}
              onFacilitiesLoad={handleFacilitiesLoad}
            />
          </div>
        </div>

        {/* Facility Risk Overview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Facility Risk Overview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Top 5 facilities in current map view by population</p>
            
            <div className="space-y-6">
              {/* Child Care Centers */}
              <div>
                <div className="flex items-center mb-3">
                  <Building2 className="h-4 w-4 text-green-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Child Care Centers</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.childCare.length})</span>
                </div>
                {visibleFacilities.childCare.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.childCare.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-green-500 pl-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.POPULATION || facility.properties?.TOT_RES || facility.properties?.BEDS) && (
                          <div className="mt-1 font-semibold text-green-700">
                            Pop: {facility.properties?.POPULATION || facility.properties?.TOT_RES || facility.properties?.BEDS}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>

              {/* Nursing Homes */}
              <div>
                <div className="flex items-center mb-3">
                  <Home className="h-4 w-4 text-orange-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Nursing Homes</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.nursing.length})</span>
                </div>
                {visibleFacilities.nursing.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.nursing.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-orange-500 pl-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.TOT_RES || facility.properties?.BEDS || facility.properties?.POPULATION) && (
                          <div className="mt-1 font-semibold text-orange-700">
                            Pop: {facility.properties?.TOT_RES || facility.properties?.BEDS || facility.properties?.POPULATION}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>

              {/* Hospitals */}
              <div>
                <div className="flex items-center mb-3">
                  <Heart className="h-4 w-4 text-red-600 mr-2" />
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Hospitals</h4>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">({visibleFacilities.hospitals.length})</span>
                </div>
                {visibleFacilities.hospitals.length > 0 ? (
                  <div className="space-y-2">
                    {visibleFacilities.hospitals.map((facility, idx) => (
                      <div key={idx} className="border-l-2 border-red-500 pl-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-r text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{facility.properties?.NAME || 'Unknown'}</div>
                        {facility.properties?.TYPE && (
                          <div className="text-gray-700 dark:text-gray-300 font-medium">Type: {facility.properties.TYPE}</div>
                        )}
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {facility.properties?.ADDRESS && (
                            <div>{facility.properties.ADDRESS}</div>
                          )}
                          {facility.properties?.CITY && facility.properties?.STATE && (
                            <div>{facility.properties.CITY}, {facility.properties.STATE}</div>
                          )}
                        </div>
                        {(facility.properties?.BEDS || facility.properties?.POPULATION) && (
                          <div className="mt-1 font-semibold text-red-700">
                            {facility.properties?.BEDS ? `Beds: ${facility.properties.BEDS}` : `Pop: ${facility.properties?.POPULATION}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No facilities in view</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}