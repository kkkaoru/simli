import { useEffect, useRef, useState } from 'react';
import { useMediaTrack } from '@daily-co/daily-react';

export default function VideoBox({ id }: any) {
  const videoTrack = useMediaTrack(id, 'video');
  const audioTrack = useMediaTrack(id, 'audio');

  const [videoSrcObjectSet, setVideoSrcObjectSet] = useState(false);
  const [audioSrcObjectSet, setAudioSrcObjectSet] = useState(false);
  const [videoStats, setVideoStats] = useState<{
    width?: number;
    height?: number;
    frameRate?: number;
    bitrate?: number;
  }>({});
  const [readyState, setReadyState] = useState<number>(0);

  const videoElement = useRef<any>(null);
  const audioElement = useRef<any>(null);

  useEffect(() => {
    const videoRef = videoElement.current;
    
    console.log('VideoBox useEffect triggered:', {
      hasVideoRef: !!videoRef,
      hasVideoTrack: !!videoTrack,
      hasTrack: !!videoTrack?.track,
      videoSrcObjectSet,
      trackState: videoTrack?.state,
    });

    if (videoRef && videoTrack?.track && !videoSrcObjectSet) {
      // Apply constraints to request higher resolution
      const track = videoTrack.track;
      if (track && 'applyConstraints' in track && track.applyConstraints) {
        // Start with minimal constraints and gradually try higher quality
        const constraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        };
        
        console.log('Applying video constraints:', constraints);
        
        track.applyConstraints(constraints).then(() => {
          console.log('Video constraints applied successfully');
          // Check the actual settings after applying constraints
          const newSettings = track.getSettings();
          console.log('New track settings after constraints:', {
            width: newSettings.width,
            height: newSettings.height,
            frameRate: newSettings.frameRate,
            aspectRatio: newSettings.aspectRatio,
          });
        }).catch((error: any) => {
          console.warn('Could not apply ideal constraints, trying fallback:', error);
          // Try with even more relaxed constraints
          return track.applyConstraints({
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24 },
          });
        }).catch((error: any) => {
          console.warn('Fallback constraints also failed, using current settings:', error);
        });
      }
      
      // Use persistentTrack if available, otherwise use track
      const trackToUse = videoTrack.persistentTrack || videoTrack.track;
      
      console.log('Setting video srcObject with track:', {
        trackId: trackToUse.id,
        trackEnabled: trackToUse.enabled,
        trackMuted: trackToUse.muted,
        trackReadyState: trackToUse.readyState,
        trackKind: trackToUse.kind,
        usingPersistentTrack: !!videoTrack.persistentTrack,
      });
      
      const stream = new MediaStream([trackToUse]);
      videoRef.srcObject = stream;
      setVideoSrcObjectSet(true);
      
      // Explicitly play the video
      videoRef.play().then(() => {
        console.log('Video play() succeeded');
      }).catch((error: any) => {
        console.error('Video play() failed:', error);
      });
      
      // Wait for video to load before monitoring stats
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded:', {
          videoWidth: videoRef.videoWidth,
          videoHeight: videoRef.videoHeight,
        });
        
        // Initial stats update
        if (videoTrack.track) {
          const settings = videoTrack.track.getSettings();
          setVideoStats({
            width: videoRef.videoWidth,
            height: videoRef.videoHeight,
            frameRate: settings.frameRate,
          });
        }
      };
      
      // Add more event listeners for debugging
      const handleCanPlay = () => {
        console.log('Video can play event fired');
      };
      
      const handlePlaying = () => {
        console.log('Video playing event fired', {
          videoWidth: videoRef.videoWidth,
          videoHeight: videoRef.videoHeight,
          readyState: videoRef.readyState,
        });
        
        // Update stats when video starts playing
        if (videoTrack.track) {
          const settings = videoTrack.track.getSettings();
          setVideoStats({
            width: videoRef.videoWidth,
            height: videoRef.videoHeight,
            frameRate: settings.frameRate,
          });
        }
      };
      
      videoRef.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoRef.addEventListener('canplay', handleCanPlay);
      videoRef.addEventListener('playing', handlePlaying);
      
      // Force a check after a delay to ensure video is loaded
      setTimeout(() => {
        if (videoRef && videoRef.videoWidth > 0) {
          console.log('Delayed check - video dimensions available:', {
            width: videoRef.videoWidth,
            height: videoRef.videoHeight,
          });
          const settings = trackToUse.getSettings();
          setVideoStats({
            width: videoRef.videoWidth,
            height: videoRef.videoHeight,
            frameRate: settings.frameRate,
          });
        }
      }, 2000);
      
      // Set up interval to monitor video stats
      const statsInterval = setInterval(() => {
        if (videoRef) {
          setReadyState(videoRef.readyState);
          
          // Try getting dimensions from both video element and track
          const videoWidth = videoRef.videoWidth;
          const videoHeight = videoRef.videoHeight;
          const settings = trackToUse.getSettings();
          
          // Use track settings if video element dimensions are not available
          const width = videoWidth || settings.width;
          const height = videoHeight || settings.height;
          
          if (width && height) {
            console.log('Updating video stats:', {
              videoWidth,
              videoHeight,
              trackWidth: settings.width,
              trackHeight: settings.height,
              readyState: videoRef.readyState,
              paused: videoRef.paused,
            });
            setVideoStats({
              width,
              height,
              frameRate: settings.frameRate,
            });
          } else {
            console.log('Video dimensions not available:', {
              videoWidth,
              videoHeight,
              trackSettings: settings,
              readyState: videoRef.readyState,
              networkState: videoRef.networkState,
              error: videoRef.error,
            });
          }
        }
      }, 500); // Changed to 500ms for more frequent updates
      
      // Log video track settings for debugging
      if (track && 'getSettings' in track) {
        const settings = track.getSettings();
        console.log('Video track settings:', {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          aspectRatio: settings.aspectRatio,
          facingMode: settings.facingMode,
          deviceId: settings.deviceId,
        });
        
        // Log video track constraints and capabilities
        if ('getCapabilities' in track && track.getCapabilities) {
          console.log('Video track capabilities:', track.getCapabilities());
        }
      }
      
      return () => {
        clearInterval(statsInterval);
        if (videoRef) {
          videoRef.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoRef.removeEventListener('canplay', handleCanPlay);
          videoRef.removeEventListener('playing', handlePlaying);
        }
      };
    }
  }, [videoTrack, videoSrcObjectSet]);

  useEffect(() => {
    const audioRef = audioElement.current;

    if (audioRef && audioTrack?.persistentTrack && !audioSrcObjectSet) {
      audioRef.srcObject = new MediaStream([audioTrack.persistentTrack]);
      setAudioSrcObjectSet(true);
    }
  }, [audioTrack, audioSrcObjectSet]);

  return (
    <div className='h-full relative'>
      {videoTrack && (
        <>
          <video 
            autoPlay={true}
            muted={true}
            playsInline={true}
            controls={false}
            ref={videoElement} 
            className="w-full h-full object-cover"
            style={{
              imageRendering: '-webkit-optimize-contrast',
              transform: 'translateZ(0)', // Hardware acceleration
            }}
            onError={(e) => {
              console.error('Video element error:', e);
            }}
            onLoadStart={() => {
              console.log('Video load started');
            }}
          />
          {/* Resolution overlay */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md font-mono text-sm">
            <div>Resolution: {videoStats.width || '-'} x {videoStats.height || '-'}</div>
            <div>FPS: {videoStats.frameRate ? Math.round(videoStats.frameRate) : '-'}</div>
            <div className="text-xs text-gray-300 mt-1">
              State: {readyState} ({
                readyState === 0 ? 'HAVE_NOTHING' :
                readyState === 1 ? 'HAVE_METADATA' :
                readyState === 2 ? 'HAVE_CURRENT_DATA' :
                readyState === 3 ? 'HAVE_FUTURE_DATA' :
                readyState === 4 ? 'HAVE_ENOUGH_DATA' : 'Unknown'
              })
            </div>
            <div className="text-xs text-gray-300">
              Track: {videoTrack?.state || 'No track'}
            </div>
          </div>
        </>
      )}
      {audioTrack && <audio autoPlay playsInline ref={audioElement} />}
    </div>
  );
}
