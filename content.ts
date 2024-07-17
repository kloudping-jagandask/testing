//Extract User Info//
async function fetchUserInfo(query, start = 0, csrfToken) {debugger;
    try {debugger;
 
        const searchUrl = `https://www.linkedin.com/voyager/api/graphql?variables=(start:${start},origin:SWITCH_SEARCH_VERTICAL,query:(keywords:${encodeURIComponent(query)},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))&queryId=voyagerSearchDashClusters.4fca70de9cb9adca43df01baf8a6e0ec`;
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'csrf-token':  csrfToken,
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok, status: ${response.status}`);
        }

        const search = await response.json();
        console.log('Response data:', search);  
        
        const items = search?.data?.searchDashClustersByAll?.elements?.[0]?.items;

        if (Array.isArray(items)) {
            const extractedData = items.map((item) => {
                const entityResult = item?.item?.entityResult;
                return {
                    name: entityResult?.title?.text,
                    jobTitle: entityResult?.primarySubtitle?.text,
                    summary: entityResult?.summary?.text,
                    location: entityResult?.secondarySubtitle?.text,
                    profileUrl: getLinkedinProfileUrl(entityResult?.navigationUrl),
                    profileId: extractProfileId(entityResult?.entityUrn || '')
                };
            });

            return extractedData;
        } else {
            console.error('Included property is not an array or is undefined');
            return [];
        }
    } catch (error) {
        console.error('Error fetching user information:', error);
        return [];
    }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {debugger;
    console.log('Content script: Received message', message);
    if (message.action === 'extractUserInfo') {debugger;
        const query = message.searchValue;
        const csrfToken = message.csrfToken
        const promises = [];
        for (let i = 0; i < 3; i++) { // Fetch 3 pages, each with 10 users
            const start = i * 10; // Start index for each page
            promises.push(fetchUserInfo(query, start, csrfToken));
        }
        Promise.all(promises)
            .then(results => {
                const extractedData = results.flat(); // Flatten the array of arrays
                sendResponse({ data: extractedData });
            })
            .catch(error => {
                console.error('Error extracting information:', error);
                sendResponse({ data: null });
            });

        return true; // Indicate that sendResponse will be called asynchronously
    }
});

function getHandle(linkedinProfileUrl) {
    const url = getLinkedinProfileUrl(linkedinProfileUrl);
    return url?.split("/in/")?.[1];
  }
  
  function getLinkedinProfileUrl(navigationUrl) {
    return navigationUrl?.split("?")?.[0];
  }

  function extractProfileId(entityUrn) {
    const match = entityUrn.match(/urn:li:fsd_profile:([^,]+)/);
    return match ? match[1] : null;
}

//Code to delay and find the Status fro Toomany Request//
async function connect(id, messageInfo,csrfToken, attempt = 1,) {debugger;
    try {
        // Adding a delay of 3 seconds before sending the request
        await new Promise(resolve => setTimeout(resolve, 3000));
        const connectRequesturl = `https://www.linkedin.com/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreateV2&decorationId=com.linkedin.voyager.dash.deco.relationships.InvitationCreationResultWithInvitee-2`;
        const response = await fetch(connectRequesturl, {
            method: 'POST',
            headers: {
                'csrf-token': csrfToken,
            },
            body: JSON.stringify({
                "invitee": {
                    "inviteeUnion": {
                        "memberProfile": `urn:li:fsd_profile:${encodeURIComponent(id)}`,
                    }
                },
                "customMessage": messageInfo,
            }),
            credentials: 'include'
        });

        if (response.status === 429) {debugger;
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2 ** attempt; // Convert Retry-After header to a number, or use exponential backoff
            if (attempt <= 5) { // Limit the number of retries
                console.warn(`Rate limit hit, retrying after ${retryAfter} seconds (attempt ${attempt})`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Wait for the retry period
                return connect(id, messageInfo, attempt + 1); // Retry with incremented attempt
            } else {
                throw new Error('Rate limit hit too many times, giving up.');
            }
        }

        if (!response.ok) {
            throw new Error(`Network response was not ok, status: ${response.status}`);
        }

        return 'Connection request sent successfully.';
    } catch (error) {
        console.error('Error while sending connection request:', error);
        throw error;
    }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {debugger;
    if (message.action === 'connectRequest') {debugger;
        const id = message.id;
        const messageInfo = message.text;
        const csrfToken = message.csrfToken;
        connect(id, messageInfo,csrfToken)
            .then(connectRequest => {
                sendResponse({ data: connectRequest });
            })
            .catch(error => {
                console.error('Error while sending connection request:', error);
                sendResponse({ data: null });
            });

        return true;
    }
});
//Code to delay and find the Status fro Toomany Request//



// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {debugger;
    if (message.action === 'ConnectionRequests') {debugger;
        const ids = message.id;
        const messageInfo = message.text;
        const csrfToken = message.csrfToken;
        Multipleconnect(ids, messageInfo, csrfToken)
            .then(connectRequest => {
                sendResponse({ data: connectRequest });
            })
            .catch(error => {
                console.error('Error while sending connection request:', error);
                sendResponse({ data: null });
            });

        return true;
    }
});

// Multiple Connection function to handle multiple IDs sequentially with a delay
async function Multipleconnect(ids, messageInfo, csrfToken) {debugger;
    const results = [];

    for (const id of ids) {
        try {debugger;
            const result = await connect(id, messageInfo, csrfToken);
            results.push(result);
        } catch (error) {
            results.push({ id, error: error.message });
        }

        // Delay of 3 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return results;
}

//Multiple Connection//
// async function Multipleconnect(ids, messageInfo,csrfToken, attempt = 1,) {debugger;
//     try {
//         // Adding a delay of 3 seconds before sending the request
//         await new Promise(resolve => setTimeout(resolve, 3000));

//         const connectRequesturl = `https://www.linkedin.com/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreateV2&decorationId=com.linkedin.voyager.dash.deco.relationships.InvitationCreationResultWithInvitee-2`;
//         const response = await fetch(connectRequesturl, {
//             method: 'POST',
//             headers: {
//                 'csrf-token': csrfToken,
//             },
//             body: JSON.stringify({
//                 "invitee": {
//                     "inviteeUnion": {
//                         "memberProfile": `urn:li:fsd_profile:${encodeURIComponent(ids)}`,
//                     }
//                 },
//                 "customMessage": messageInfo,
//             }),
//             credentials: 'include'
//         });

//         if (response.status === 429) {debugger;
//             const retryAfterHeader = response.headers.get('Retry-After');
//             const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2 ** attempt; // Convert Retry-After header to a number, or use exponential backoff
//             if (attempt <= 5) { // Limit the number of retries
//                 console.warn(`Rate limit hit, retrying after ${retryAfter} seconds (attempt ${attempt})`);
//                 await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Wait for the retry period
//                 return connect(ids, messageInfo, attempt + 1); // Retry with incremented attempt
//             } else {
//                 throw new Error('Rate limit hit too many times, giving up.');
//             }
//         }

//         if (!response.ok) {
//             throw new Error(`Network response was not ok, status: ${response.status}`);
//         }

//         return 'Connection request sent successfully.';
//     } catch (error) {
//         console.error('Error while sending connection request:', error);
//         throw error;
//     }
// }