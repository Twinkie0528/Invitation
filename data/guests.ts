import data from "./guests.json";

export type Guest = {
  slug: string;
  name: string;
  date?: string;
};

export const guests = data as Guest[];
