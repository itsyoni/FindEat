export type SelectedAddress = {
  id: string;
  placeName: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  countryCode?: string | null;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  } | null;
  source?: "SEARCH" | "MAP" | "CURRENT_LOCATION";
};

export type StayLocationSuggestion = {
  googlePlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};
