declare module "docxtemplater-image-module-free" {
  type ImageModuleOptions = {
    centered?: boolean;
    fileType?: string;
    getImage: (tagValue: unknown, tagName?: string) => Uint8Array | ArrayBuffer | Promise<Uint8Array | ArrayBuffer>;
    getSize: (
      img: unknown,
      tagValue?: unknown,
      tagName?: string,
    ) => [number, number] | Promise<[number, number]>;
  };

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
