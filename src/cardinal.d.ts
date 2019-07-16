declare module 'cardinal' {
    interface HighlightOptions {
        jsx?: boolean;
    }

    interface Highlight {
        (code: string, options?: HighlightOptions): string;
    }
    export var highlight: Highlight;
}
