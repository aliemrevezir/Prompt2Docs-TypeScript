// src/utils/markdownConverter.ts
import { ConversationItem, Metadata, Settings } from '../types';

export function convertToMarkdown(
    data: { metadata?: Metadata; conversations: ConversationItem[] },
    settings: Settings
): string {
    try {
        let markdown = '';

        // Add header with styling
        markdown += '# ChatGPT Conversation Export 🤖\n\n';

        // Add metadata if enabled
        if (settings.includeMetadata && data.metadata) {
            markdown += '## 📋 Metadata\n\n';
            markdown += '```yaml\n';
            markdown += `Timestamp: ${data.metadata.timestamp}\n`;
            markdown += `Platform: ${data.metadata.platform}\n`;
            markdown += `URL: ${data.metadata.url}\n`;
            markdown += `Version: ${data.metadata.version}\n`;
            markdown += `Exported By: ${data.metadata.exportedBy}\n`;
            markdown += '```\n\n';
            markdown += '---\n\n';
        }

        // Process each conversation
        data.conversations.forEach((conv, index) => {
            markdown += `## Conversation ${index + 1}\n\n`;

            if (settings.includePrompts) {
                markdown += '### 🧑‍💻 User\n\n';
                markdown += `${formatText(conv.prompt)}\n\n`;
            }

            if (settings.includeResponses) {
                markdown += '### 🤖 Assistant\n\n';
                
                // Process answer text with LaTeX placeholders
                let answerText = formatText(conv.answer);
                
                // Replace LaTeX placeholders with actual formulas
                if (conv.latexBlocks && conv.latexBlocks.length > 0) {
                    conv.latexBlocks.forEach((block, index) => {
                        const placeholder = `[LATEX_BLOCK_${index}]`;
                        const formula = block.displayMode 
                            ? `\n$$${block.formula}$$\n`
                            : `$${block.formula}$`;
                        answerText = answerText.replace(placeholder, formula);
                    });
                }
                
                markdown += `${answerText}\n\n`;

                // Handle code blocks if present
                if (settings.formatCodeBlocks && conv.codeBlocks && conv.codeBlocks.length > 0) {
                    markdown += '#### 💻 Code Examples\n\n';
                    conv.codeBlocks.forEach((block, blockIndex) => {
                        markdown += `<details>\n`;
                        markdown += `<summary>Code Example ${blockIndex + 1} (${block.language})</summary>\n\n`;
                        markdown += '```' + block.language + '\n';
                        markdown += block.code + '\n';
                        markdown += '```\n\n';
                        markdown += '</details>\n\n';
                    });
                }

                // Handle LaTeX blocks in a separate section
                if (conv.latexBlocks && conv.latexBlocks.length > 0) {
                    markdown += '#### 📐 LaTeX Formulas\n\n';
                    conv.latexBlocks.forEach((block, blockIndex) => {
                        markdown += `<details>\n`;
                        markdown += `<summary>Formula ${blockIndex + 1} (${block.displayMode ? 'Display' : 'Inline'})</summary>\n\n`;
                        markdown += '```latex\n';
                        markdown += block.formula + '\n';
                        markdown += '```\n\n';
                        markdown += '</details>\n\n';
                    });
                }

                // Handle images if present
                if (conv.images && conv.images.length > 0) {
                    markdown += '#### 🖼️ Images\n\n';
                    conv.images.forEach((img, imgIndex) => {
                        markdown += `![Image ${imgIndex + 1}](${img})\n\n`;
                    });
                }
            }

            markdown += '---\n\n';
        });

        // Add footer
        markdown += '\n*Generated with ❤️ by [Prompt2Docs](https://wezirim.com)*\n';

        return markdown;
    } catch (error) {
        console.error('Error in markdown conversion:', error);
        throw new Error('Failed to convert to markdown format');
    }
}

function formatText(text: string): string {
    if (!text) return '';
    
    return text
        .replace(/\*\*/g, '__')  // Bold
        .replace(/\*/g, '_')     // Italic
        .replace(/`([^`]+)`/g, '`$1`')  // Inline code
        .replace(/\n\n/g, '\n\n')  // Preserve paragraphs
        .trim();
}