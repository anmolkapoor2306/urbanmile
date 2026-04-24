const puppeteer = require('puppeteer');

async function testScrolling() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // Navigate to admin page
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check if body has overflow: hidden
    const bodyStyles = await page.evaluate(() => {
      return {
        bodyOverflow: document.body.style.overflow,
        bodyComputedOverflow: window.getComputedStyle(document.body).overflow,
        htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
        windowHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
      };
    });
    
    console.log('Body scroll test results:');
    console.log('Body overflow style:', bodyStyles.bodyOverflow);
    console.log('Body computed overflow:', bodyStyles.bodyComputedOverflow);
    console.log('HTML overflow:', bodyStyles.htmlOverflow);
    console.log('Window height:', bodyStyles.windowHeight);
    console.log('Document height:', bodyStyles.documentHeight);
    console.log('Body height:', bodyStyles.bodyHeight);
    
    // Check if main content has proper height
    const mainContentStyles = await page.evaluate(() => {
      const adminFrame = document.querySelector('.bg-zinc-950');
      if (adminFrame) {
        return {
          adminFrameHeight: adminFrame.style.height,
          adminFrameComputedHeight: window.getComputedStyle(adminFrame).height,
          adminFrameDisplay: window.getComputedStyle(adminFrame).display,
        };
      }
      return null;
    });
    
    console.log('\nMain content styles:');
    console.log(mainContentStyles);
    
    // Check for scrollable content sections
    const scrollableSections = await page.evaluate(() => {
      const scrollableElements = Array.from(document.querySelectorAll('.dashboard-scrollbar'));
      return scrollableElements.map(el => ({
        tag: el.tagName,
        overflowY: window.getComputedStyle(el).overflowY,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }));
    });
    
    console.log('\nScrollable content sections:', scrollableSections.length > 0 ? scrollableSections : 'None found');
    
    // Test actual scrolling
    const canScrollBody = await page.evaluate(() => {
      const initialScrollY = window.scrollY;
      window.scrollBy(0, 100);
      const newScrollY = window.scrollY;
      window.scrollTo(0, initialScrollY);
      return newScrollY > initialScrollY;
    });
    
    console.log('\nCan scroll body:', canScrollBody);
    console.log('Expected: false (scrolling should be disabled)');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testScrolling();