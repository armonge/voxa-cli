declare module "xliff" {
  export function jsToXliff12(
    json: any,
    options: {
      spaces?: string;
      xmlLangAttr?: boolean;
    },
    cb: (error: Error | null, result?: any) => void
  ): void;

  export function jsToXliff12(
    json: any,
    options?: {
      spaces?: string;
      xmlLangAttr?: boolean;
    }
  ): string;
}
