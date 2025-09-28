// This file should be placed in the folder path `netlify/functions/generate-image.js`
// in its own dedicated GitHub repository. It acts as a secure intermediary
// between your website and the Google AI API.

exports.handler = async function(event) {
    // We'll only allow POST requests for security.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the data sent from the website.
        const { prompt, mimeType, imageData } = JSON.parse(event.body);

        // Securely access the API key from an environment variable.
        // You will set this key in your Netlify dashboard, NOT here in the code.
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
             return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key is not configured on the server.' }),
            };
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

        // Prepare the payload to send to the Google AI.
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType, data: imageData } }
                ]
            }],
            generationConfig: { responseModalities: ['IMAGE'] },
        };

        // Make the request to the Google AI API.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Handle errors from the Google AI API.
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Google API Error:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Google AI API request failed: ${response.statusText}` })
            };
        }

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (!base64Data) {
             return {
                statusCode: 500,
                body: JSON.stringify({ error: 'No image data found in Google AI response.' }),
            };
        }

        // Send the generated image data back to the user's browser.
        return {
            statusCode: 200,
            body: JSON.stringify({ imageData: base64Data }),
        };

    } catch (error) {
        console.error('Server function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};


