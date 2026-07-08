export interface ColorPreset {
  label: string;
  hex: string;
}

/** Flat UI palette (https://flatuicolors.com/) — omits very light neutrals poor on title bars. */
export const FLAT_UI_PRESETS: ColorPreset[] = [
  { label: 'Turquoise', hex: '#1abc9c' },
  { label: 'Green Sea', hex: '#16a085' },
  { label: 'Emerald', hex: '#2ecc71' },
  { label: 'Nephritis', hex: '#27ae60' },
  { label: 'Peter River', hex: '#3498db' },
  { label: 'Belize Hole', hex: '#2980b9' },
  { label: 'Amethyst', hex: '#9b59b6' },
  { label: 'Wisteria', hex: '#8e44ad' },
  { label: 'Wet Asphalt', hex: '#34495e' },
  { label: 'Midnight Blue', hex: '#2c3e50' },
  { label: 'Sun Flower', hex: '#f1c40f' },
  { label: 'Orange', hex: '#f39c12' },
  { label: 'Carrot', hex: '#e67e22' },
  { label: 'Pumpkin', hex: '#d35400' },
  { label: 'Alizarin', hex: '#e74c3c' },
  { label: 'Pomegranate', hex: '#c0392b' },
  { label: 'Concrete', hex: '#95a5a6' },
  { label: 'Asbestos', hex: '#7f8c8d' },
];
