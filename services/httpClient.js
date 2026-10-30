import axios from 'axios';

// Shared client for every outgoing API call (Google Maps, SMS, email).
// axios advertises Brotli by default, and when a provider answers with an empty or truncated Brotli body
// Node throws "Error: Decompression failed" (BrotliDecoder). gzip/deflate are always decoded safely, so only ask for those.
const http = axios.create({
  headers: { 'Accept-Encoding': 'gzip, deflate' },
});

export default http;
