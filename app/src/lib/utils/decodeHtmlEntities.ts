export const decodeHtmlEntities = (html: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
};

export const parseHtml = (html: string) => {
    // Convert HTML to markdown-like format for react-markdown
    let content = html
      .replace(/<p>/g, '\n\n')
      .replace(/<\/p>/g, '')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)')
      .replace(/<[^>]*>/g, '');
    
    // Decode HTML entities using native browser functionality
    return decodeHtmlEntities(content);
  };