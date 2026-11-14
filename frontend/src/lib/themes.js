// Theme table for the Business receipt. Matches the five background images.
// folder name -> { bg, ink, mut, accent, accentText, panel, swatch }
export const THEMES = {
  red: {
    folder: 'receipt-pro-bg-red',
    bg: '#FDECEC',
    ink: '#501313',
    mut: '#791F1F',
    accent: '#A32D2D',
    accentText: '#fff',
    panel: 'rgba(255,255,255,.72)',
    swatch: '#D32F2F',
  },
  blue: {
    folder: 'receipt-pro-bg-blue',
    bg: '#E6EEFD',
    ink: '#0B2A6B',
    mut: '#1E4FD8',
    accent: '#1E4FD8',
    accentText: '#fff',
    panel: 'rgba(255,255,255,.72)',
    swatch: '#1E4FD8',
  },
  lightBlue: {
    folder: 'receipt-pro-bg-light-blue',
    bg: '#EAF6FD',
    ink: '#0C447C',
    mut: '#1F7FBF',
    accent: '#2B8FD1',
    accentText: '#fff',
    panel: 'rgba(255,255,255,.72)',
    swatch: '#7CC4EE',
  },
  black: {
    folder: 'receipt-pro-bg-black',
    bg: '#161616',
    ink: '#F5F5F5',
    mut: '#B5B5B5',
    accent: '#FFFFFF',
    accentText: '#161616',
    panel: 'rgba(255,255,255,.08)',
    swatch: '#161616',
  },
  white: {
    folder: 'receipt-pro-bg-white',
    bg: '#FFFFFF',
    ink: '#1A1A1A',
    mut: '#555555',
    accent: '#1A1A1A',
    accentText: '#fff',
    panel: 'rgba(245,245,245,.8)',
    swatch: '#FFFFFF',
  },
};

export const THEME_ORDER = ['red', 'blue', 'lightBlue', 'black', 'white'];
export const DEFAULT_THEME = 'blue';

export function themeUrl(t) {
  return `/images/${t.folder}/${t.folder}.jpg`;
}