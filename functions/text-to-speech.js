const { ElevenLabs } = require("elevenlabs-node");

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const voice = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  try {
    const { text } = JSON.parse(event.body);
    const audioStream = await voice.textToSpeech("eleven_monolingual_v1", {
      text: text,
      voice_id: "21m00Tcm4TlvDq8ikWAM", // You can change this to your preferred voice ID
      model_id: "eleven_monolingual_v1",
    });

    // Convert the audio stream to a base64 encoded string
    const audioBuffer = await streamToBuffer(audioStream);
    const base64Audio = audioBuffer.toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ audio: base64Audio })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while processing your request.' })
    };
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
