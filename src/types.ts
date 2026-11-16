export interface RawCountry {
  name?: string;
  flag?: string;
  flags?: { svg?: string; png?: string };
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: { name?: string }[];
  currencies?: { name?: string; code?: string; symbol?: string }[];
}

export interface Country {
  name: string;
  flag: string;
  capital: string;
  region: string;
  population: number | null;
  languages: string[];
  description: string;
  area: number | null;
  borders: string[];
  currencies: string[];
}
