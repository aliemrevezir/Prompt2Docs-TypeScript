import browser from 'webextension-polyfill';
import { ConversationItem, Message } from './types';
import { processLatexInConversation } from './utils/latexExtractor';

function getElementByXPath(xpath: string): Element | null {
    const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    );
    return result.singleNodeValue as Element;
}

function getAllElementsByXPath(xpath: string): Element[] {
    const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    
    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
        const element = result.snapshotItem(i) as Element;
        if (element) elements.push(element);
    }
    return elements;
}

function extractCodeBlocksFromArticle(article: Element): { language: string; code: string }[] {
    const codeBlocks: { language: string; code: string }[] = [];
    
    // Find all pre elements in the article
    const preElements = article.querySelectorAll('pre');
    
    preElements.forEach(pre => {
        // Get language div (first div in pre)
        const languageDiv = pre.querySelector('div[class*="language"]') || 
                           pre.querySelector('div > div:first-child');
                           
        // Get code element
        const codeElement = pre.querySelector('code');
        
        if (languageDiv && codeElement) {
            const language = languageDiv.textContent?.trim().toLowerCase() || 'plaintext';
            const code = codeElement.textContent?.trim() || '';
            
            if (code) {
                codeBlocks.push({
                    language: language.replace(/^language[-:]?\s*/i, ''),
                    code: code
                });
            }
        }
    });
    
    return codeBlocks;
}

function convertHtmlToText(html: string): string {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Convert specific elements to markdown-like format
    const elements = tempDiv.querySelectorAll('*');
    elements.forEach(element => {
        if (element.tagName === 'H1') {
            element.textContent = `\n# ${element.textContent}\n`;
        } else if (element.tagName === 'H2') {
            element.textContent = `\n## ${element.textContent}\n`;
        } else if (element.tagName === 'H3') {
            element.textContent = `\n### ${element.textContent}\n`;
        } else if (element.tagName === 'P') {
            element.textContent = `\n${element.textContent}\n`;
        } else if (element.tagName === 'UL') {
            const items = Array.from(element.children)
                .map(li => `\n- ${li.textContent?.trim()}`)
                .join('');
            element.textContent = items + '\n';
        } else if (element.tagName === 'OL') {
            const items = Array.from(element.children)
                .map((li, index) => `\n${index + 1}. ${li.textContent?.trim()}`)
                .join('');
            element.textContent = items + '\n';
        } else if (element.tagName === 'HR') {
            element.textContent = '\n---\n';
        } else if (element.tagName === 'STRONG' || element.tagName === 'B') {
            element.textContent = `**${element.textContent}**`;
        } else if (element.tagName === 'EM' || element.tagName === 'I') {
            element.textContent = `*${element.textContent}*`;
        }
    });

    // Get text content and clean up extra whitespace
    let text = tempDiv.textContent || '';
    text = text.replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    
    return text;
}

function extractData(): ConversationItem[] {
    const extractedData: ConversationItem[] = [];
    const baseArticle = "/html/body/div[1]/div[2]/main/div[1]/div[1]/div/div/div/div/article";
    
    // Get all articles
    const articles = getAllElementsByXPath(baseArticle);
    console.log(`Found ${articles.length} articles`);
    
    // Process articles in pairs (prompt and response)
    for (let i = 0; i < articles.length; i += 2) {
        const promptArticle = articles[i];
        const responseArticle = articles[i + 1];
        
        if (!promptArticle || !responseArticle) continue;
        
        // Extract prompt
        const promptElement = promptArticle.querySelector('.text-base');
        const prompt = promptElement?.textContent?.trim() || '';
        
        // Extract response
        const responseElement = responseArticle.querySelector('.text-base');
        const answer = responseElement?.innerHTML?.trim() || '';

        // Extract LaTeX blocks and replace with placeholders
        const latexBlocks: { formula: string; displayMode: boolean }[] = [];
        let processedAnswer = answer;

        // Find all KaTeX elements
        const katexElements = responseArticle.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)');
        katexElements.forEach((katexElement, index) => {
            const displayMode = katexElement.classList.contains('katex-display');
            const annotation = katexElement.querySelector('.katex-html annotation[encoding="application/x-tex"]');
            
            if (annotation) {
                const formula = annotation.textContent || '';
                latexBlocks.push({ formula, displayMode });
                
                // Create placeholder and replace the LaTeX content
                const placeholder = displayMode ? `\n(Formula_${index + 1})\n` : `(Formula_${index + 1})`;
                processedAnswer = processedAnswer.replace(katexElement.outerHTML, placeholder);
            }
        });

        // Convert HTML to readable text
        processedAnswer = convertHtmlToText(processedAnswer);

        // Extract code blocks from response article
        const codeBlocks = extractCodeBlocksFromArticle(responseArticle);
        
        // Extract images
        const images: string[] = [];
        const imageElements = responseArticle.querySelectorAll('img');
        imageElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) images.push(src);
        });
        
        if (prompt && processedAnswer) {
            // Create initial conversation object
            let conversation: ConversationItem = {
                prompt,
                answer: processedAnswer,
                images: images.length > 0 ? images : undefined,
                codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
                // Only include latexBlocks if formatLatex is true and there are blocks
                latexBlocks: latexBlocks.length > 0 ? latexBlocks : undefined
            };

            // Process LaTeX content if needed
            if (latexBlocks.length > 0) {
                conversation = processLatexInConversation(conversation);
            }
            
            console.log('Processed conversation:', conversation); // Debug log
            extractedData.push(conversation);
        }
    }

    return extractedData;
}

// Listen for messages from the popup
browser.runtime.onMessage.addListener((message: Message) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'EXTRACT_DATA') {
        try {
            const data = extractData();
            console.log('Extracted data:', data);
            return Promise.resolve(data);
        } catch (error) {
            console.error('Error extracting data:', error);
            return Promise.reject(error);
        }
    }
}); 