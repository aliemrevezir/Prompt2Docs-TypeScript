import browser from 'webextension-polyfill';
import { ConversationItem, Message } from './types';

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
        const answer = responseElement?.textContent?.trim() || '';
        
        // Extract code blocks from response article
        const codeBlocks = extractCodeBlocksFromArticle(responseArticle);
        
        // Extract images
        const images: string[] = [];
        const imageElements = responseArticle.querySelectorAll('img');
        imageElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) images.push(src);
        });
        
        if (prompt && answer) {
            extractedData.push({
                prompt,
                answer,
                images: images.length > 0 ? images : undefined,
                codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
            });
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