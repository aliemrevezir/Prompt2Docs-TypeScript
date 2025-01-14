export interface CodeBlock {
    language: string;
    code: string;
}

export interface LatexBlock {
    formula: string;
    displayMode: boolean;
}

export interface ConversationItem {
    prompt: string;
    answer: string;
    images?: string[];
    codeBlocks?: { language: string; code: string }[];
    latexBlocks?: { formula: string; displayMode: boolean }[];
}

export interface Metadata {
    timestamp: string;
    url: string;
    platform: string;
    version: string;
    exportedBy: string;
}

export interface XPathConfig {
    promptXPath: string;
    answerXPath: string;
    imageXPath: string;
}

export interface Message {
    type: 'EXTRACT_DATA';
    config: XPathConfig;
}

export interface Settings {
    exportFormat: 'json' | 'markdown';
    includeMetadata: boolean;
    includePrompts: boolean;
    includeResponses: boolean;
    preserveLineBreaks: boolean;
    formatCodeBlocks: boolean;
    formatLatex: boolean;
    prettyPrintJSON: boolean;
    autoGenerateFilename: boolean;
    platform: string;
    promptLabel: string;
    responseLabel: string;
}

export const DEFAULT_SETTINGS: Settings = {
    exportFormat: 'json',
    includeMetadata: true,
    includePrompts: true,
    includeResponses: true,
    preserveLineBreaks: true,
    formatCodeBlocks: true,
    formatLatex: true,
    prettyPrintJSON: true,
    autoGenerateFilename: true,
    platform: 'ChatGPT',
    promptLabel: 'prompt',
    responseLabel: 'response'
}; 
