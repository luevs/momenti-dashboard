import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const Monitoreo = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource("http://192.168.0.76:8081/output.m3u8");
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = "http://192.168.0.76:8081/output.m3u8";
      video.addEventListener('loadedmetadata', () => {
        video.play();
      });
    }
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Monitoreo</h1>
      <video
        ref={videoRef}
        controls
        width="100%"
        height="auto"
        className="rounded shadow-md"
      />
    </div>
  );
};

export default Monitoreo;
