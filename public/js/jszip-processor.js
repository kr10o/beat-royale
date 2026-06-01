// public/js/jszip-processor.js
const BUCKET_URL = 'https://assets.beat-battle-royale.com';
const AUTH_HEADER_KEY = 'g1jhg34g4gfdvh34cf43hf33fhff43uguft43fz43fzf43';

window.fetchAndUnzipPack = async (packName = 'battle_pack_1') => {
  console.log(`Fetching sample pack: ${packName} from R2 bucket: ${BUCKET_URL}...`);
  try {
    const response = await fetch(`${BUCKET_URL}/${packName}.zip`, {
      method: 'GET',
      headers: { 
        'X-Asset-Key': AUTH_HEADER_KEY 
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    // JSZip loaded globally via CDN in daw-app.html
    const zip = await window.JSZip.loadAsync(arrayBuffer);
    const extractedSamples = [];

    for (const [filename, fileData] of Object.entries(zip.files)) {
      if (!fileData.dir && filename.match(/\.(wav|mp3|ogg|flac)$/i)) {
        const blob = await fileData.async('blob');
        const url = URL.createObjectURL(blob); 
        const cleanName = filename.split('/').pop().replace(/\.[^/.]+$/, "");
        
        extractedSamples.push({ name: cleanName, url });
      }
    }
    return extractedSamples;
  } catch (error) {
    console.warn("R2 Asset load failed (CORS/Authentication/Bucket Offline). Utilizing browser synthesized audio fallback.", error);
    // Return empty array to signal fallback audio loading
    return [];
  }
};
