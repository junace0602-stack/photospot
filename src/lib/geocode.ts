import { loadGoogleMaps } from './googleMaps'

export interface AutocompleteResult {
  place_id: string
  name: string
  address: string
}

export interface PlaceDetail {
  name: string
  address: string
  lat: number
  lng: number
  country: string | null
}

export async function searchPlacesAutocomplete(query: string, regionCodes?: string[]): Promise<AutocompleteResult[]> {
  try {
    await loadGoogleMaps()
  } catch {
    return []
  }

  try {
    const request: google.maps.places.AutocompleteRequest = { input: query }
    if (regionCodes && regionCodes.length > 0) {
      request.includedRegionCodes = regionCodes
    }

    const { suggestions } = await google.maps.places.AutocompleteSuggestion
      .fetchAutocompleteSuggestions(request)

    return suggestions
      .filter((s) => s.placePrediction)
      .slice(0, 5)
      .map((s) => {
        const p = s.placePrediction!
        return {
          place_id: p.placeId,
          name: p.mainText?.text ?? '',
          address: p.secondaryText?.text ?? '',
        }
      })
  } catch {
    return []
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetail | null> {
  try {
    await loadGoogleMaps()
  } catch {
    return null
  }

  try {
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })

    const loc = place.location
    let lat = 0
    let lng = 0
    if (loc) {
      const latVal = loc.lat
      const lngVal = loc.lng
      lat = typeof latVal === 'function' ? latVal() : latVal
      lng = typeof lngVal === 'function' ? lngVal() : lngVal
    }

    const countryComponent = place.addressComponents?.find((c) => c.types.includes('country'))

    return {
      name: place.displayName ?? '',
      address: place.formattedAddress ?? '',
      lat,
      lng,
      country: countryComponent?.longText ?? null,
    }
  } catch {
    return null
  }
}
