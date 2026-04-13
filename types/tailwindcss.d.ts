declare module 'tailwindcss/lib/util/flattenColorPalette' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function flattenColorPalette(colors: Record<string, any>): Record<string, string>;
  export default flattenColorPalette;
}
