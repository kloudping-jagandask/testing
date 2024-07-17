chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.webNavigation.onCompleted.addListener(() => {
    console.log('Navigation completed');
    chrome.tabs.query({ active: true, currentWindow: true }, ([{ id }]) => {
      if (id) {
        console.log('Showing page action for tab:', id);
        chrome.pageAction.show(id);
      }
    });
  }, { url: [{ urlMatches: 'google.com' }] });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {debugger;
  console.log('Background script: Received message', message);
  if (message.action === 'extractUserInfo' || message.action === 'connectRequest'|| message.action ==='ConnectionRequests') {debugger;
    chrome.tabs.query({ url: '*://www.linkedin.com/*' }, tabs => {
      if (tabs.length > 0) {
        // Fetch cookies only if the action is 'extractUserInfo'
        if (message.action === 'extractUserInfo' ||  message.action === 'connectRequest'|| message.action ==='ConnectionRequests') {debugger;
          chrome.cookies.getAll({ domain: 'linkedin.com' }, (cookies) => {
            const csrfTokenCookie = cookies.find(cookie => cookie.name === 'JSESSIONID');
            let csrfToken = csrfTokenCookie ? csrfTokenCookie.value : '';
          
            // Remove extra quotes if present
            csrfToken = csrfToken.replace(/^"+|"+$/g, '');
            message.csrfToken = csrfToken;

            // Send message to the content script with the necessary data
            chrome.tabs.sendMessage(tabs[0].id, message, response => {
              console.log('Background script: Received response from content script', response);
              sendResponse(response);
            });
          });
        } else {
          // If the action is 'connectRequest', just forward the message
          chrome.tabs.sendMessage(tabs[0].id, message, response => {
            console.log('Background script: Received response from content script', response);
            sendResponse(response);
          });
        }
      } else {
        console.error('LinkedIn tab not found.');
        sendResponse({ data: null });
      }
    });

    return true; // Indicate that sendResponse will be called asynchronously
  }
});

