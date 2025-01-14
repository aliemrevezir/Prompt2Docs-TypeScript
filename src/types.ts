export interface ConversationItem {
    prompt: string;
    answer: string;
    images?: string[];
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
}

export const DEFAULT_SETTINGS: Settings = {
    platform: 'chatgpt',
    includePrompts: true,
    includeResponses: true,
    includeMetadata: false,
    preserveLineBreaks: true,
    formatCodeBlocks: false,
    prettyPrintJSON: true,
    promptLabel: 'prompt',
    responseLabel: 'response',
    autoGenerateFilename: true
}; 