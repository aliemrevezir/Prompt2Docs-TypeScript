export interface CodeBlock {
    language: string;
    code: string;
}

export interface ConversationItem {
    prompt: string;
    answer: string;
    images?: string[];
    codeBlocks?: CodeBlock[];
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
    platform: string;
    includePrompts: boolean;
    includeResponses: boolean;
    includeMetadata: boolean;
    preserveLineBreaks: boolean;
    formatCodeBlocks: boolean;
    prettyPrintJSON: boolean;
    promptLabel: string;
    responseLabel: string;
    autoGenerateFilename: boolean;
    exportFormat: 'json' | 'markdown';
}

export const DEFAULT_SETTINGS: Settings = {
    platform: 'chatgpt',
    includePrompts: true,
    includeResponses: true,
    includeMetadata: false,
    preserveLineBreaks: true,
    formatCodeBlocks: true,
    prettyPrintJSON: true,
    promptLabel: 'prompt',
    responseLabel: 'response',
    autoGenerateFilename: true,
    exportFormat: 'markdown'
}; 
