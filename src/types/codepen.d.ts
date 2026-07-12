declare global {
  interface Window {
    __CPEmbed?: () => void;
  }
}