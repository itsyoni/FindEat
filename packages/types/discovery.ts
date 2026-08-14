import type { ActiveCountry, CityViewport } from "./city";

export type DiscoveryContext =
  | { kind: "ACTIVE_COUNTRY"; country: ActiveCountry }
  | {
      kind: "TRIP";
      listId: string;
      destinationName: string;
      countryCode?: string | null;
      latitude: number;
      longitude: number;
      viewport?: CityViewport | null;
      stayLocation?: {
        name?: string | null;
        latitude: number;
        longitude: number;
      } | null;
    };

export type SaveContext = {
  sourceListId?: string;
  sourcePostId?: string;
  discoveryContext?: DiscoveryContext;
};
