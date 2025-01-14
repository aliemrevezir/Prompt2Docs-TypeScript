import { ConversationItem } from '../types';

export function processLatexInConversation(conversation: ConversationItem): ConversationItem {
    // If no LaTeX blocks, return as is
    if (!conversation.latexBlocks || conversation.latexBlocks.length === 0) {
        return conversation;
    }

    // Create a copy of the conversation
    const processedConversation = { ...conversation };

    // Process each LaTeX block
    processedConversation.latexBlocks = conversation.latexBlocks.map(block => ({
        formula: cleanLatexFormula(block.formula),
        displayMode: block.displayMode
    }));

    return processedConversation;
}

function cleanLatexFormula(formula: string): string {
    // Remove unnecessary whitespace
    let cleaned = formula.trim();
    
    // Remove unnecessary newlines
    cleaned = cleaned.replace(/\s*\n\s*/g, ' ');
    
    // Remove duplicate spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove unnecessary environment declarations if present
    cleaned = cleaned.replace(/\\begin\{(align|equation|gather)\*?\}(.*?)\\end\{\1\*?\}/g, '$2');
    
    return cleaned;
} 