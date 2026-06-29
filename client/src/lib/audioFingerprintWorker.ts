// Audio Fingerprint Worker
// Calculates acoustic fingerprints via RMS bins and compares them using Pearson Correlation

self.onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === 'GENERATE') {
    try {
      const { pcmData, sampleRate } = payload;
      
      const binSize = Math.floor(sampleRate / 10); // 100ms bins
      const maxBins = 100; // max 10 seconds
      const fingerprint: number[] = [];

      for (let i = 0; i < maxBins; i++) {
        const start = i * binSize;
        const end = start + binSize;
        
        if (start >= pcmData.length) break;
        
        const slice = pcmData.subarray(start, Math.min(end, pcmData.length));
        let sumSquares = 0;
        for (let j = 0; j < slice.length; j++) {
          sumSquares += slice[j] * slice[j];
        }
        const rms = Math.sqrt(sumSquares / slice.length);
        fingerprint.push(rms);
      }

      const sumRMS = fingerprint.reduce((a, b) => a + b, 0);
      const meanRMS = fingerprint.length > 0 ? sumRMS / fingerprint.length : 0;
      
      if (meanRMS < 0.001) {
        throw new Error('INCONCLUSIVE_SILENCE');
      }

      self.postMessage({ type: 'GENERATE_RESULT', fingerprint });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  } else if (type === 'COMPARE') {
    try {
      const { localPayload, remotePayload } = payload;

      // Handle Fallback Size and Duration check
      if (
        typeof localPayload === 'object' && localPayload !== null && 'size' in localPayload && 'duration' in localPayload &&
        typeof remotePayload === 'object' && remotePayload !== null && 'size' in remotePayload && 'duration' in remotePayload
      ) {
        const sizeDiff = Math.abs(localPayload.size - remotePayload.size);
        const durationDiff = Math.abs(localPayload.duration - remotePayload.duration);
        
        // Match if size difference is less than 50MB and duration difference is less than 1 second
        const isMatch = sizeDiff < 50_000_000 && durationDiff < 1.0;
        self.postMessage({ type: 'COMPARE_RESULT', isMatch });
        return;
      }

      // Handle Pearson Correlation for Arrays
      if (Array.isArray(localPayload) && Array.isArray(remotePayload)) {
        const minLength = Math.min(localPayload.length, remotePayload.length);
        
        if (minLength === 0) {
          self.postMessage({ type: 'COMPARE_RESULT', isMatch: false, correlation: 0 });
          return;
        }

        const X = localPayload.slice(0, minLength);
        const Y = remotePayload.slice(0, minLength);

        const sumX = X.reduce((a, b) => a + b, 0);
        const sumY = Y.reduce((a, b) => a + b, 0);
        const meanX = sumX / minLength;
        const meanY = sumY / minLength;

        let num = 0;
        let denX = 0;
        let denY = 0;

        for (let i = 0; i < minLength; i++) {
          const diffX = X[i] - meanX;
          const diffY = Y[i] - meanY;
          num += diffX * diffY;
          denX += diffX * diffX;
          denY += diffY * diffY;
        }

        const den = Math.sqrt(denX * denY);
        const correlation = den === 0 ? 0 : num / den;
        const isMatch = correlation > 0.85;

        self.postMessage({ type: 'COMPARE_RESULT', isMatch, correlation });
        return;
      }

      // Type mismatch (e.g., host sent size, viewer sent array)
      self.postMessage({ type: 'COMPARE_RESULT', isMatch: false });

    } catch (error: any) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }
};
