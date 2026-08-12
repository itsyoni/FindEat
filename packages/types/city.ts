export type CityCoordinate = [number, number];

export type CityViewport = {
  southwest: CityCoordinate;
  northeast: CityCoordinate;
};

export type CityPolygon = {
  type: "Polygon";
  coordinates: CityCoordinate[][];
};

export type CityMultiPolygon = {
  type: "MultiPolygon";
  coordinates: CityCoordinate[][][];
};

export type CityBoundaryGeometry = CityPolygon | CityMultiPolygon;

export type MapAreaType = "CITY" | "NEIGHBORHOOD";

export type CityFilterLocation = {
  source: "AREA";
  areaType: MapAreaType;
  googlePlaceId: string;
  name: string;
  formattedAddress?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude: number;
  longitude: number;
  viewport: CityViewport;
  boundary?: CityBoundaryGeometry | null;
};
