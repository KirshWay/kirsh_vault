import { FocusScope } from '@radix-ui/react-focus-scope';
import Image from 'next/image';
import {
  ACTION_CLOSE,
  ACTION_NEXT,
  ACTION_PREV,
  type ComponentProps,
  createModule,
  isImageSlide,
  MODULE_PORTAL,
  type Plugin,
  useEvents,
  useLightboxState,
} from 'yet-another-react-lightbox';

import { imageEntries } from '@/lib/images';

import styles from './image-viewer.module.css';

function GalleryLayout({ children }: ComponentProps) {
  const { slides, currentIndex } = useLightboxState();
  const { publish } = useEvents();
  const images = imageEntries(slides.filter(isImageSlide).map((slide) => slide.src));

  return (
    <FocusScope
      asChild
      loop
      // The lightbox owns initial focus, background inertness and focus restoration.
      onMountAutoFocus={(event) => event.preventDefault()}
      onUnmountAutoFocus={(event) => event.preventDefault()}
    >
      <div
        className={styles.layout}
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            publish(ACTION_CLOSE);
          }
        }}
      >
        <div className={styles.stage}>{children}</div>
        {images.length > 1 && (
          <nav
            className={styles.thumbnails}
            aria-label="Image thumbnails"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                publish(event.key === 'ArrowLeft' ? ACTION_PREV : ACTION_NEXT);
              }
            }}
          >
            {images.map(({ src, key }, index) => (
              <button
                key={key}
                type="button"
                className={styles.thumbnail}
                aria-label={`View image ${index + 1}`}
                aria-current={index === currentIndex}
                onClick={() => {
                  const distance = index - currentIndex;
                  if (distance) {
                    publish(distance > 0 ? ACTION_NEXT : ACTION_PREV, {
                      count: Math.abs(distance),
                    });
                  }
                }}
              >
                <Image unoptimized src={src} width={48} height={48} alt="" />
              </button>
            ))}
          </nav>
        )}
      </div>
    </FocusScope>
  );
}

export const GalleryLayoutPlugin: Plugin = ({ append }) => {
  append(MODULE_PORTAL, createModule('gallery-layout', GalleryLayout));
};
