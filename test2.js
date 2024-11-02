const https = require('https');
// const SUBSCRIPTION_KEY = process.env['AZURE_SUBSCRIPTION_KEY'];
const SUBSCRIPTION_KEY = '5280b64fb691436992f27b313cab8222';

if (!SUBSCRIPTION_KEY) {
    throw new Error('Missing the AZURE_SUBSCRIPTION_KEY environment variable');
}

function bingWebSearch(query) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: 'api.bing.microsoft.com',
            path: '/v7.0/news/search?q=' + encodeURIComponent(query),
            headers: { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY },
        }, res => {
            let body = '';
            res.on('data', part => body += part);
            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(body);
                    // Define the Story interface

                    // Find the first story with an imageUrl
                    const firstStoryWithImage = jsonResponse.value.find((story) => story.image && story.image.thumbnail && story.image.thumbnail.contentUrl);

                    // Extract the first three news stories and build an array of objects
                    // const firstThreeStories = jsonResponse.value.slice(0, 3).map((story : Story )=> ({
                    //     name: story.name,
                    //     url: story.url,
                    //     description: story.description,
                    //     datePublished: story.datePublished,
                    //     provider: story.provider && story.provider[0] ? story.provider[0].name : 'Unknown',
                    //     imageUrl: story.image && story.image.thumbnail ? story.image.thumbnail.contentUrl : null,
                    //     videoName: story.video ? story.video.name : null,
                    //     videoUrl: story.video ? story.video.motionThumbnailUrl : null,
                    // }));
                    // resolve(firstThreeStories);
                    if (firstStoryWithImage) {
                        const result = {
                            name: firstStoryWithImage.name,
                            url: firstStoryWithImage.url,
                            description: firstStoryWithImage.description,
                            datePublished: firstStoryWithImage.datePublished,
                            provider: firstStoryWithImage.provider && firstStoryWithImage.provider[0] ? firstStoryWithImage.provider[0].name : 'Unknown',
                            imageUrl: firstStoryWithImage.image.thumbnail.contentUrl,
                            videoName: firstStoryWithImage.video ? firstStoryWithImage.video.name : null,
                            videoUrl: firstStoryWithImage.video ? firstStoryWithImage.video.motionThumbnailUrl : null,
                        }
                        resolve(result);
                    } else {
                        resolve(null); // or handle the case where no story with an imageUrl is found
                    }
                } catch (error) {
                    reject('Failed to parse JSON response: ');
                }
            });
            res.on('error', e => {
                reject('Error: ' + e.message);
            });
        }).on('error', e => {
            reject(`Request Error: ${e.message}`);
        });
    });
}

const query = 'latest news on election';

bingWebSearch(query)
    .then(stories => {
        console.log('First news stories:', stories);
    })
    .catch(error => {
        console.error('Error news stories:', error);
    });