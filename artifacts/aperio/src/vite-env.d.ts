/// <reference types="vite/client" />

declare module 'three' {
  const content: any;
  export default content;
  export const PlaneGeometry: any;
  export const Float32BufferAttribute: any;
  export const Color: any;
  export const MathUtils: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        [elemName: string]: any;
      }
    }
  }
}
